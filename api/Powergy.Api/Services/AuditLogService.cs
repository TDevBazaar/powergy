using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Auth;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Models;

namespace Powergy.Api.Services;

/// <summary>Diferencia de un campo entre su valor anterior y el nuevo.</summary>
public sealed record AuditChange(object? Before, object? After);

/// <summary>Acumula únicamente los campos que realmente cambiaron.</summary>
public sealed class AuditChangeSet
{
    private readonly Dictionary<string, AuditChange> _changes = new(StringComparer.Ordinal);

    public AuditChangeSet Add(string field, object? before, object? after)
    {
        if (!Equals(before, after))
        {
            _changes[field] = new AuditChange(before, after);
        }

        return this;
    }

    public bool HasChanges => _changes.Count > 0;

    public IReadOnlyDictionary<string, AuditChange> Build() => _changes;
}

public interface IAuditLogService
{
    Task RecordAsync(
        string entityType,
        string entityId,
        string action,
        IReadOnlyDictionary<string, AuditChange> changes,
        CancellationToken cancellationToken);

    Task<PagedResponse<AdminAuditLogResponse>> GetPageAsync(
        AdminAuditLogQueryRequest request,
        CancellationToken cancellationToken);
}

public sealed class AuditLogService(
    PowergyDbContext db,
    ICurrentAdminAccessor admins,
    ILogger<AuditLogService> logger) : IAuditLogService
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public async Task RecordAsync(
        string entityType,
        string entityId,
        string action,
        IReadOnlyDictionary<string, AuditChange> changes,
        CancellationToken cancellationToken)
    {
        var adminUserId = await admins.GetAdminUserIdAsync(cancellationToken);
        var payload = JsonSerializer.Serialize(
            changes.ToDictionary(
                entry => entry.Key,
                entry => new { before = entry.Value.Before, after = entry.Value.After }),
            SerializerOptions);

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            AdminUserId = adminUserId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            Changes = payload,
            CreatedAt = DateTime.UtcNow
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            // La auditoría nunca debe tumbar la operación de negocio ya confirmada.
            logger.LogError(
                exception,
                "No se pudo registrar la auditoría {Action} {EntityType} {EntityId}.",
                action,
                entityType,
                entityId);
            return;
        }

        logger.LogInformation(
            "Auditoría: admin {AdminUserId} {Action} {EntityType} {EntityId} con {ChangeCount} cambio(s).",
            adminUserId,
            action,
            entityType,
            entityId,
            changes.Count);
    }

    public async Task<PagedResponse<AdminAuditLogResponse>> GetPageAsync(
        AdminAuditLogQueryRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.AdminAuditLogs
            .AsNoTracking()
            .Include(log => log.AdminUser)
            .AsQueryable();

        var entityType = request.EntityType?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(entityType))
        {
            query = query.Where(log => log.EntityType == entityType);
        }

        var entityId = request.EntityId?.Trim();
        if (!string.IsNullOrEmpty(entityId))
        {
            query = query.Where(log => log.EntityId == entityId);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var logs = await query
            .OrderByDescending(log => log.CreatedAt)
            .ThenByDescending(log => log.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<AdminAuditLogResponse>(
            logs.Select(log => new AdminAuditLogResponse(
                log.Id,
                log.AdminUserId,
                log.AdminUser?.Email,
                log.EntityType,
                log.EntityId,
                log.Action,
                ParseChanges(log.Changes),
                new DateTimeOffset(DateTime.SpecifyKind(log.CreatedAt, DateTimeKind.Utc))))
                .ToArray(),
            request.Page,
            request.PageSize,
            totalItems,
            (int)Math.Ceiling(totalItems / (double)request.PageSize));
    }

    private static JsonElement ParseChanges(string changes)
    {
        try
        {
            return JsonSerializer.Deserialize<JsonElement>(changes);
        }
        catch (JsonException)
        {
            return JsonSerializer.Deserialize<JsonElement>("{}");
        }
    }
}
