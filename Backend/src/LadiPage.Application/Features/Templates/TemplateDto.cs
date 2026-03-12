namespace LadiPage.Application.Features.Templates;

public record TemplateDto(
    long Id,
    string Name,
    string Category,
    string? ThumbnailUrl,
    DateTime CreatedAt
);

public record TemplateDetailDto(
    long Id,
    string Name,
    string Category,
    string? ThumbnailUrl,
    string JsonContent,
    DateTime CreatedAt
);

