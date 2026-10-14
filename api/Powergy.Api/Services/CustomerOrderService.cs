using Microsoft.EntityFrameworkCore;
using Npgsql;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;

namespace Powergy.Api.Services;

public sealed class CustomerOrderService(PowergyDbContext db) : ICustomerOrderService
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
                    UnitPriceUsd = product.PriceUsd
                };
            }).ToList()
        };

        order.EstimatedTotalUsd = order.Lines.All(line => line.UnitPriceUsd.HasValue)
            ? order.Lines.Sum(line => line.UnitPriceUsd!.Value * line.Quantity)
            : null;
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

        return CustomerOrderMappings.ToResponse(order);
    }

    public async Task<PagedResponse<CustomerOrderListItemResponse>> GetPageAsync(
        CustomerOrderQueryRequest request,
        CancellationToken cancellationToken)
    {
        ValidateDateRange(request.From, request.To);
        var status = request.Status?.Trim().ToLowerInvariant();
        if (status is not null
            && status is not CustomerOrderStatuses.Requested and not CustomerOrderStatuses.Closed)
        {
            throw new ApiValidationException("El estado del pedido no es válido.");
        }

        var query = db.CustomerOrders.AsNoTracking();
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
        CancellationToken cancellationToken)
    {
        var order = await db.CustomerOrders
            .AsNoTracking()
            .Include(item => item.Lines)
            .Include(item => item.StatusHistory)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return order is null ? null : CustomerOrderMappings.ToResponse(order);
    }

    public async Task<CustomerOrderResponse> CloseAsync(
        Guid id,
        Guid adminUserId,
        CancellationToken cancellationToken)
    {
        var order = await db.CustomerOrders
            .Include(item => item.Lines)
            .Include(item => item.StatusHistory)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró la solicitud.");

        if (order.Status == CustomerOrderStatuses.Closed)
        {
            return CustomerOrderMappings.ToResponse(order);
        }

        if (order.Status != CustomerOrderStatuses.Requested)
        {
            throw new ApiConflictException("La solicitud no se puede cerrar desde su estado actual.");
        }

        var now = DateTime.UtcNow;
        order.Status = CustomerOrderStatuses.Closed;
        order.ClosedAt = now;
        order.ClosedByAdminUserId = adminUserId;
        order.StatusHistory.Add(new CustomerOrderStatusHistory
        {
            Id = Guid.NewGuid(),
            PreviousStatus = CustomerOrderStatuses.Requested,
            Status = CustomerOrderStatuses.Closed,
            ChangedByAdminUserId = adminUserId,
            ChangedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);

        return CustomerOrderMappings.ToResponse(order);
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
        var inPeriod = db.CustomerOrders.AsNoTracking()
            .Where(order => order.CreatedAt >= fromUtc && order.CreatedAt < toUtc);

        var totals = await inPeriod
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Requests = group.Count(),
                ClosedRequests = group.Sum(order =>
                    order.Status == CustomerOrderStatuses.Closed ? 1 : 0),
                EstimatedValueUsd = group.Sum(order => order.EstimatedTotalUsd),
                ClosedEstimatedValueUsd = group
                    .Where(order => order.Status == CustomerOrderStatuses.Closed)
                    .Sum(order => order.EstimatedTotalUsd)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var closedDuringPeriod = await db.CustomerOrders
            .CountAsync(order => order.ClosedAt >= fromUtc
                && order.ClosedAt < toUtc,
                cancellationToken);
        var requests = totals?.Requests ?? 0;
        var closedRequests = totals?.ClosedRequests ?? 0;

        return new CustomerOrderMetricsResponse(
            from,
            to,
            requests,
            closedRequests,
            requests - closedRequests,
            totals?.EstimatedValueUsd,
            totals?.ClosedEstimatedValueUsd,
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
