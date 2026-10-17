namespace Powergy.Api.Models;

/// <summary>Registro de auditoría de cambios administrativos en catálogo y categorías.</summary>
public sealed class AdminAuditLog
{
    public Guid Id { get; set; }
    public Guid? AdminUserId { get; set; }
    public AdminUser? AdminUser { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;

    /// <summary>Diferencias aplicadas, serializadas como JSON.</summary>
    public string Changes { get; set; } = "{}";

    public DateTime CreatedAt { get; set; }
}

public static class AuditEntityTypes
{
    public const string Product = "product";
    public const string Category = "category";
}

public static class AuditActions
{
    public const string Create = "create";
    public const string Update = "update";
    public const string Deactivate = "deactivate";
}
