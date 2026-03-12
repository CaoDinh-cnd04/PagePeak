namespace LadiPage.Application.Features.Workspaces;

public record WorkspaceDto(
    long Id,
    string Name,
    string Slug,
    string? LogoUrl,
    bool IsDefault,
    DateTime CreatedAt
);
