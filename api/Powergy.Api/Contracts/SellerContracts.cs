using System.ComponentModel.DataAnnotations;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

public sealed record PublicSellerResponse(
    string ReferralCode,
    string DisplayName,
    string WhatsAppPhone);

public sealed record AdminSellerProfileResponse(
    Guid Id,
    string? Email,
    string? DisplayName,
    string? ReferralCode,
    string? WhatsAppPhone);

public sealed record UpdateAdminSellerProfileRequest
{
    [StringLength(100)]
    public string? DisplayName { get; init; }

    [StringLength(40)]
    public string? ReferralCode { get; init; }

    [StringLength(30)]
    public string? WhatsAppPhone { get; init; }
}

public static class SellerMappings
{
    public static string? NormalizeCodeOrNull(string? raw)
    {
        var value = raw?.Trim().ToLowerInvariant();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    public static bool IsValidCode(string code) =>
        code.Length is >= 2 and <= 40
        && char.IsAsciiLetterOrDigit(code[0])
        && code.All(ch => char.IsAsciiLetterOrDigit(ch) || ch is '-' or '_');

    public static string DisplayLabel(AdminUser admin)
    {
        var name = admin.DisplayName?.Trim();
        if (!string.IsNullOrEmpty(name))
        {
            return name;
        }

        var email = admin.Email?.Trim();
        if (!string.IsNullOrEmpty(email))
        {
            var at = email.IndexOf('@');
            return at > 0 ? email[..at] : email;
        }

        return "Asesor";
    }
}
