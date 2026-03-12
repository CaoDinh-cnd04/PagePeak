namespace LadiPage.Application.Features.Auth;

public record UserProfileDto(
    long Id,
    string Email,
    string FullName,
    string? Phone,
    string? AvatarUrl,
    string Role,
    int? CurrentPlanId,
    DateTime? PlanExpiresAt
);
