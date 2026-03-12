namespace LadiPage.Application.Features.Pages;

public record PageDto(
    long Id,
    long WorkspaceId,
    string Name,
    string Slug,
    string Status,
    DateTime UpdatedAt
);

