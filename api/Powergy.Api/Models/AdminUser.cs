namespace Powergy.Api.Models;

public sealed class AdminUser
{
    public Guid Id { get; set; }
    public Guid SupabaseUserId { get; set; }
    public string? Email { get; set; }
    public required string Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
