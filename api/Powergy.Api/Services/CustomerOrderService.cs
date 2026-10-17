using Microsoft.EntityFrameworkCore;
using Npgsql;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;

namespace Powergy.Api.Services;

public sealed class CustomerOrderService(
    PowergyDbContext db,
    ILogger<CustomerOrderService> logger) : ICustomerOrderService
{
    private const int MaxDistinctItems = 20;
    private const int MaxQuantityPerProduct = 99;

    public async Task<CustomerOrderResponse> CreateAsync(
        CreateCustomerOrderRequest request,
        CancellationToken cancellationToken)
    {
        if (request.IdempotencyKey == Guid.Empty)
        {
            throw new ApiValidationException("La clave de solicitud no es válida.");
        }

        var store = StoreKeys.Resolve(request.Store);

        var existing = await FindByIdempotencyKey(request.IdempotencyKey, cancellationToken);
        if (existing is not null)
        {
            return CustomerOrderMappings.ToResponse(existing);
        }

        if (request.Items is null || request.Items.Count is 0 or > MaxDistinctItems)
        {
            throw new ApiValidationException(
                $"El pedido debe contener entre 1 y {MaxDistinctItems} productos.");
        }

        var items = request.Items
            .Where(item => !string.IsNullOrWhiteSpace(item.ProductId))
            .GroupBy(item => item.ProductId.Trim(), StringComparer.Ordinal)
            .Select(group => new
            {
                ProductId = group.Key,
                Quantity = group.Sum(item => item.Quantity)
            })
            .ToArray();

        if (items.Length is 0 or > MaxDistinctItems
            || items.Any(item => item.Quantity is < 1 or > MaxQuantityPerProduct))
        {
            throw new ApiValidationException("Las cantidades del pedido no son válidas.");
        }

        var productIds = items.Select(item => item.ProductId).ToArray();
        var products = await db.Products
            .AsNoTracking()
            .Include(product => product.Category)
            .Where(product => productIds.Contains(product.Id)
                && product.Store == store
                && product.IsActive
                && product.Category.IsActive)
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        if (products.Count != items.Length)
        {
            throw new ApiValidationException(
                "Uno o más productos ya no están disponibles. Actualiza el catálogo e inténtalo de nuevo.");
        }

        var now = DateTime.UtcNow;
        var order = new CustomerOrder
        {
            Id = Guid.NewGuid(),
            IdempotencyKey = request.IdempotencyKey,
            Store = store,
            Status = CustomerOrderStatuses.Requested,
            CreatedAt = now,
            Lines = items.Select(item =>
            {
                var product = products[item.ProductId];
                return new CustomerOrderLine
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductSlug = product.Slug,
                    CategoryName = product.Category.Name,
                    Quantity = item.Quantity,
                    OriginalQuantity = item.Quantity,
                    UnitPriceUsd = product.PriceUsd
                };
            }).ToList()
        };

        order.EstimatedTotalUsd = TotalEstimado(order.Lines);
        order.OriginalEstimatedTotalUsd = order.EstimatedTotalUsd;
        order.StatusHistory.Add(new CustomerOrderStatusHistory
        {
            Id = Guid.NewGuid(),
            PreviousStatus = null,
            Status = CustomerOrderStatuses.Requested,
            ChangedAt = now
        });

        db.CustomerOrders.Add(order);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (IsIdempotencyConflict(exception))
        {
            db.ChangeTracker.Clear();
            var duplicate = await FindByIdempotencyKey(
                request.IdempotencyKey,
                cancellationToken);
            if (duplicate is not null)
            {
                return CustomerOrderMappings.ToResponse(duplicate);
            }

            throw;
        }

        logger.LogInformation(
            "Solicitud {Reference} de la tienda {Store} registrada con {ItemCount} producto(s) por {Total}.",
            CustomerOrderMappings.Reference(order.Id),
            order.Store,
            order.Lines.Count,
            order.EstimatedTotalUsd);

        return CustomerOrderMappings.ToResponse(order);
    }

    public async Task<PagedResponse<CustomerOrderListItemResponse>> GetPageAsync(
        CustomerOrderQueryRequest request,
        CancellationToken cancellationToken)
    {
        ValidateDateRange(request.From, request.To);
        var status = request.Status?.Trim().ToLowerInvariant();
        if (status is not null && !CustomerOrderStatuses.All.Contains(status))
        {
            throw new ApiValidationException("El estado del pedido no es válido.");
        }

        var store = StoreKeys.Resolve(request.Store);
        var query = db.CustomerOrders
            .AsNoTracking()
            .Where(order => order.Store == store);
        if (status is not null)
        {
            query = query.Where(order => order.Status == status);
        }

        if (request.From is { } from)
        {
            var fromUtc = from.UtcDateTime;
            query = query.Where(order => order.CreatedAt >= fromUtc);
        }

        if (request.To is { } to)
        {
            var toUtc = to.UtcDateTime;
            query = query.Where(order => order.CreatedAt < toUtc);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var page = await query
            .Include(order => order.Lines)
            .OrderByDescending(order => order.CreatedAt)
            .ThenByDescending(order => order.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<CustomerOrderListItemResponse>(
            page.Select(CustomerOrderMappings.ToListItem).ToArray(),
            request.Page,
            request.PageSize,
            totalItems,
            (int)Math.Ceiling(totalItems / (double)request.PageSize));
    }

    public async Task<CustomerOrderResponse?> GetByIdAsync(
        Guid id,
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var order = await db.CustomerOrders
            .AsNoTracking()
            .Include(item => item.Lines)
            .Include(item => item.StatusHistory)
            .FirstOrDefaultAsync(
                item => item.Id == id && item.Store == tienda,
                cancellationToken);

        return order is null ? null : CustomerOrderMappings.ToResponse(order);
    }

    public async Task<CustomerOrderResponse> CloseAsync(
        Guid id,
        string? store,
        Guid adminUserId,
        CloseCustomerOrderRequest request,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var outcome = request.Outcome?.Trim().ToLowerInvariant();
        if (outcome is not CustomerOrderStatuses.Closed and not CustomerOrderStatuses.Cancelled)
        {
            throw new ApiValidationException("El resultado de la solicitud no es válido.");
        }

        var cancellationReason = CustomerOrderCancellationReasons.Normalize(
            request.CancellationReason);
        if (outcome == CustomerOrderStatuses.Cancelled
            && !CustomerOrderCancellationReasons.IsValid(cancellationReason))
        {
            throw new ApiValidationException("Indica un motivo de cancelación válido.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Bloqueo pesimista de la fila: serializa dos cierres simultáneos de la misma
        // solicitud, de modo que solo el primero registra el historial.
        await db.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM customer_orders WHERE id = {0} FOR UPDATE",
            [id],
            cancellationToken);

        var order = await db.CustomerOrders
            .Include(item => item.Lines)
            .Include(item => item.StatusHistory)
            .FirstOrDefaultAsync(
                item => item.Id == id && item.Store == tienda,
                cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró la solicitud.");

        if (CustomerOrderStatuses.IsFinal(order.Status))
        {
            // Ya fue finalizada (por ejemplo, dos administradores a la vez):
            // se devuelve el estado actual sin duplicar el historial.
            await transaction.RollbackAsync(cancellationToken);
            return CustomerOrderMappings.ToResponse(order);
        }

        if (order.Status != CustomerOrderStatuses.Requested)
        {
            throw new ApiConflictException("La solicitud no se puede finalizar desde su estado actual.");
        }

        var now = DateTime.UtcNow;
        if (request.Items is not null)
        {
            ApplyFinalLines(order, request.Items, adminUserId, now);
        }

        order.Status = outcome;
        order.ClosedAt = now;
        order.ClosedByAdminUserId = adminUserId;
        order.CancellationReason = outcome == CustomerOrderStatuses.Cancelled
            ? cancellationReason
            : null;
        order.CancellationNote = outcome == CustomerOrderStatuses.Cancelled
            ? NormalizeNote(request.CancellationNote)
            : null;

        // Se agrega explícitamente al DbSet: al añadir una entidad con clave ya
        // asignada a la colección de una entidad rastreada, EF la marca como
        // Modified y generaría un UPDATE (0 filas) en lugar de un INSERT.
        db.CustomerOrderStatusHistory.Add(new CustomerOrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            PreviousStatus = CustomerOrderStatuses.Requested,
            Status = outcome,
            ChangedByAdminUserId = adminUserId,
            ChangedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation(
            "Solicitud {Reference} de la tienda {Store} finalizada como {Outcome} por el "
                + "admin {AdminUserId}; motivo {Reason}; total {Total}.",
            CustomerOrderMappings.Reference(order.Id),
            order.Store,
            outcome,
            adminUserId,
            cancellationReason ?? "-",
            order.EstimatedTotalUsd);

        if (outcome == CustomerOrderStatuses.Closed && CustomerOrderMappings.HasUnpricedItems(order))
        {
            logger.LogWarning(
                "La solicitud {Reference} se cerró como vendida con productos sin precio definido.",
                CustomerOrderMappings.Reference(order.Id));
        }

        return CustomerOrderMappings.ToResponse(order);
    }

    /// <summary>
    /// Aplica el conjunto final de líneas: ajusta cantidades y precios negociados, y
    /// marca como quitadas (sin borrar) las líneas que el cliente ya no lleva.
    /// </summary>
    private static void ApplyFinalLines(
        CustomerOrder order,
        IReadOnlyList<CloseCustomerOrderLineRequest> items,
        Guid adminUserId,
        DateTime now)
    {
        var finales = items
            .Where(item => !string.IsNullOrWhiteSpace(item.ProductId))
            .GroupBy(item => item.ProductId.Trim(), StringComparer.Ordinal)
            .Select(group => new
            {
                ProductId = group.Key,
                Quantity = group.Sum(item => item.Quantity),
                UnitPriceUsd = group
                    .Select(item => item.UnitPriceUsd)
                    .FirstOrDefault(price => price.HasValue)
            })
            .ToArray();

        if (finales.Length is 0 or > MaxDistinctItems
            || finales.Any(item => item.Quantity is < 1 or > MaxQuantityPerProduct))
        {
            throw new ApiValidationException("Las cantidades de la solicitud no son válidas.");
        }

        var activas = order.Lines
            .Where(line => line.RemovedAt is null)
            .ToDictionary(line => line.ProductId, StringComparer.Ordinal);
        if (finales.Any(item => !activas.ContainsKey(item.ProductId)))
        {
            throw new ApiValidationException(
                "Solo se pueden quitar o ajustar productos ya presentes en la solicitud.");
        }

        var cantidades = finales.ToDictionary(
            item => item.ProductId,
            item => item,
            StringComparer.Ordinal);

        foreach (var line in activas.Values)
        {
            if (cantidades.TryGetValue(line.ProductId, out var final))
            {
                line.Quantity = final.Quantity;
                if (final.UnitPriceUsd is { } price)
                {
                    line.UnitPriceUsd = price;
                }
            }
            else
            {
                line.RemovedAt = now;
                line.RemovedByAdminUserId = adminUserId;
            }
        }

        order.EstimatedTotalUsd = TotalEstimado(
            order.Lines.Where(line => line.RemovedAt is null));
    }

    /// <summary>Devuelve el total solo cuando todas las líneas tienen precio definido.</summary>
    private static decimal? TotalEstimado(IEnumerable<CustomerOrderLine> lines)
    {
        var lista = lines.ToArray();
        if (lista.Length == 0 || lista.Any(line => line.UnitPriceUsd is null))
        {
            return null;
        }

        return lista.Sum(line => line.UnitPriceUsd!.Value * line.Quantity);
    }

    private static string? NormalizeNote(string? note)
    {
        var value = note?.Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    public async Task<CustomerOrderMetricsResponse> GetMetricsAsync(
        CustomerOrderMetricsRequest request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var from = request.From?.ToUniversalTime() ?? now.AddDays(-30);
        var to = request.To?.ToUniversalTime() ?? now;
        ValidateDateRange(from, to);
        if (to - from > TimeSpan.FromDays(3660))
        {
            throw new ApiValidationException("El período máximo para estadísticas es de 10 años.");
        }

        var fromUtc = from.UtcDateTime;
        var toUtc = to.UtcDateTime;
        var store = StoreKeys.Resolve(request.Store);
        var inPeriod = db.CustomerOrders.AsNoTracking()
            .Where(order => order.Store == store
                && order.CreatedAt >= fromUtc
                && order.CreatedAt < toUtc);

        var totals = await inPeriod
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Requests = group.Count(),
                ClosedRequests = group.Sum(order =>
                    order.Status == CustomerOrderStatuses.Closed ? 1 : 0),
                CancelledRequests = group.Sum(order =>
                    order.Status == CustomerOrderStatuses.Cancelled ? 1 : 0),
                EstimatedValueUsd = group.Sum(order => order.EstimatedTotalUsd),
                OriginalEstimatedValueUsd = group.Sum(order => order.OriginalEstimatedTotalUsd),
                ClosedEstimatedValueUsd = group
                    .Where(order => order.Status == CustomerOrderStatuses.Closed)
                    .Sum(order => order.EstimatedTotalUsd),
                CancelledEstimatedValueUsd = group
                    .Where(order => order.Status == CustomerOrderStatuses.Cancelled)
                    .Sum(order => order.EstimatedTotalUsd),
                ClosedWithoutPriceRequests = group.Sum(order =>
                    order.Status == CustomerOrderStatuses.Closed
                        && order.EstimatedTotalUsd == null ? 1 : 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var closedDuringPeriod = await db.CustomerOrders
            .CountAsync(order => order.Store == store
                && order.Status == CustomerOrderStatuses.Closed
                && order.ClosedAt >= fromUtc
                && order.ClosedAt < toUtc,
                cancellationToken);
        var requests = totals?.Requests ?? 0;
        var closedRequests = totals?.ClosedRequests ?? 0;
        var cancelledRequests = totals?.CancelledRequests ?? 0;

        return new CustomerOrderMetricsResponse(
            from,
            to,
            requests,
            closedRequests,
            cancelledRequests,
            requests - closedRequests - cancelledRequests,
            totals?.EstimatedValueUsd,
            totals?.OriginalEstimatedValueUsd,
            totals?.ClosedEstimatedValueUsd,
            totals?.CancelledEstimatedValueUsd,
            totals?.ClosedWithoutPriceRequests ?? 0,
            requests == 0 ? null : (decimal)closedRequests / requests,
            closedDuringPeriod);
    }

    private Task<CustomerOrder?> FindByIdempotencyKey(
        Guid idempotencyKey,
        CancellationToken cancellationToken) =>
        db.CustomerOrders
            .AsNoTracking()
            .Include(order => order.Lines)
            .Include(order => order.StatusHistory)
            .FirstOrDefaultAsync(
                order => order.IdempotencyKey == idempotencyKey,
                cancellationToken);

    private static bool IsIdempotencyConflict(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_customer_orders_idempotency_key"
        };

    private static void ValidateDateRange(DateTimeOffset? from, DateTimeOffset? to)
    {
        if (from.HasValue && to.HasValue && from.Value >= to.Value)
        {
            throw new ApiValidationException("La fecha inicial debe ser anterior a la fecha final.");
        }
    }
}
