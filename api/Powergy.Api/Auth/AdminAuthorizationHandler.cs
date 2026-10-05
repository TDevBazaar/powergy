using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Data;

namespace Powergy.Api.Auth;

public sealed class AdminAuthorizationHandler(PowergyDbContext db)
    : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRequirement requirement)
    {
        var subject = context.User.FindFirstValue("sub");
        if (!Guid.TryParse(subject, out var supabaseUserId))
        {
            return;
        }

        var isAdmin = await db.AdminUsers.AnyAsync(
            admin => admin.SupabaseUserId == supabaseUserId
                && admin.IsActive
                && admin.Role == "admin");

        if (isAdmin)
        {
            context.Succeed(requirement);
        }
    }
}
