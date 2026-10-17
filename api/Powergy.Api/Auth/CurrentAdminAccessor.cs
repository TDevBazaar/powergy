using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Data;

namespace Powergy.Api.Auth;

/// <summary>
/// Resuelve, una sola vez por petición, la clave interna del administrador
/// autenticado a partir del identificador de Supabase del token.
/// </summary>
public interface ICurrentAdminAccessor
{
    Task<Guid?> GetAdminUserIdAsync(CancellationToken cancellationToken);
}

public sealed class CurrentAdminAccessor(
    IHttpContextAccessor httpContextAccessor,
    PowergyDbContext db) : ICurrentAdminAccessor
{
    private bool _resolved;
    private Guid? _adminUserId;

    public async Task<Guid?> GetAdminUserIdAsync(CancellationToken cancellationToken)
    {
        if (_resolved)
        {
            return _adminUserId;
        }

        var subject = httpContextAccessor.HttpContext?.User.FindFirstValue("sub");
        if (Guid.TryParse(subject, out var supabaseUserId))
        {
            _adminUserId = await db.AdminUsers
                .AsNoTracking()
                .Where(admin => admin.SupabaseUserId == supabaseUserId
                    && admin.IsActive
                    && admin.Role == "admin")
                .Select(admin => (Guid?)admin.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        _resolved = true;
        return _adminUserId;
    }
}
