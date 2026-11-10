using Microsoft.EntityFrameworkCore;
using Npgsql;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;

namespace Powergy.Api.Services;

public sealed class SellerService(
    PowergyDbContext db,
    IAuditLogService audit) : ISellerService
{
    public async Task<PublicSellerResponse?> GetPublicByCodeAsync(
        string code,
        CancellationToken cancellationToken)
    {
        var cleanCode = SellerMappings.NormalizeCodeOrNull(code);
        if (cleanCode is null || !SellerMappings.IsValidCode(cleanCode))
        {
            return null;
        }

        var seller = await db.AdminUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                admin => admin.IsActive
                    && admin.Role == "admin"
                    && admin.ReferralCode == cleanCode
                    && admin.WhatsAppPhone != null
                    && admin.WhatsAppPhone != "",
                cancellationToken);

        if (seller is null)
        {
            return null;
        }

        return new PublicSellerResponse(
            seller.ReferralCode!,
            SellerMappings.DisplayLabel(seller),
            seller.WhatsAppPhone!);
    }

    public async Task<AdminSellerProfileResponse> GetAdminProfileAsync(
        Guid adminUserId,
        CancellationToken cancellationToken)
    {
        var admin = await db.AdminUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == adminUserId && item.IsActive,
                cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró el perfil del administrador.");

        return ToAdminProfile(admin);
    }

    public async Task<AdminSellerProfileResponse> UpdateAdminProfileAsync(
        Guid adminUserId,
        UpdateAdminSellerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var admin = await db.AdminUsers
            .FirstOrDefaultAsync(
                item => item.Id == adminUserId && item.IsActive,
                cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró el perfil del administrador.");

        var displayName = NormalizeDisplayName(request.DisplayName);
        var referralCode = SellerMappings.NormalizeCodeOrNull(request.ReferralCode);
        var whatsAppPhone = NormalizeWhatsAppPhone(request.WhatsAppPhone);

        if (referralCode is not null && !SellerMappings.IsValidCode(referralCode))
        {
            throw new ApiValidationException(
                "El código de enlace debe tener entre 2 y 40 caracteres (letras minúsculas, números, guion o guion bajo, empezando por letra o número).");
        }

        if (referralCode is not null && whatsAppPhone is null)
        {
            throw new ApiValidationException(
                "Ingresa tu número de WhatsApp para activar tu enlace personalizado.");
        }

        if (whatsAppPhone is not null && referralCode is null)
        {
            throw new ApiValidationException(
                "Define un código corto para tu enlace junto con tu número de WhatsApp.");
        }

        if (referralCode is not null
            && await db.AdminUsers.AnyAsync(
                other => other.Id != adminUserId && other.ReferralCode == referralCode,
                cancellationToken))
        {
            throw new ApiConflictException(
                "Ese código de enlace ya está en uso por otro administrador.");
        }

        var anterior = new
        {
            admin.DisplayName,
            admin.ReferralCode,
            admin.WhatsAppPhone
        };

        admin.DisplayName = displayName;
        admin.ReferralCode = referralCode;
        admin.WhatsAppPhone = whatsAppPhone;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (IsReferralCodeConflict(exception))
        {
            throw new ApiConflictException(
                "Ese código de enlace ya está en uso por otro administrador.");
        }

        var cambios = new AuditChangeSet()
            .Add("displayName", anterior.DisplayName, admin.DisplayName)
            .Add("referralCode", anterior.ReferralCode, admin.ReferralCode)
            .Add("whatsappPhone", anterior.WhatsAppPhone, admin.WhatsAppPhone)
            .Build();

        if (cambios.Count > 0)
        {
            await audit.RecordAsync(
                AuditEntityTypes.AdminProfile,
                admin.Id.ToString(),
                AuditActions.Update,
                cambios,
                cancellationToken);
        }

        return ToAdminProfile(admin);
    }

    private static string? NormalizeDisplayName(string? raw)
    {
        var clean = raw?.Trim();
        if (string.IsNullOrEmpty(clean))
        {
            return null;
        }

        if (clean.Length > 100)
        {
            throw new ApiValidationException("El nombre visible no puede superar los 100 caracteres.");
        }

        return clean;
    }

    private static string? NormalizeWhatsAppPhone(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var digits = new string(raw.Where(char.IsAsciiDigit).ToArray());
        var hasInvalidChars = raw.Any(ch =>
            !char.IsAsciiDigit(ch)
            && !char.IsWhiteSpace(ch)
            && ch is not ('+' or '-' or '(' or ')' or '.'));

        if (hasInvalidChars || digits.Length is < 7 or > 15)
        {
            throw new ApiValidationException(
                "Ingresa un número de WhatsApp válido (7 a 15 dígitos incluyendo código de país, p. ej. 5359749037).");
        }

        return digits;
    }

    private static AdminSellerProfileResponse ToAdminProfile(AdminUser admin) => new(
        admin.Id,
        admin.Email,
        admin.DisplayName,
        admin.ReferralCode,
        admin.WhatsAppPhone);

    private static bool IsReferralCodeConflict(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_admin_users_referral_code"
        };
}
