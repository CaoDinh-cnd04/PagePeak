namespace LadiPage.Application.Features.Templates;

public record TemplateDto(
    long Id,
    string Name,
    string Category,
    string? ThumbnailUrl,
    string? Description,
    string DesignType,
    bool IsFeatured,
    int UsageCount,
    DateTime CreatedAt
);

public record TemplateDetailDto(
    long Id,
    string Name,
    string Category,
    string? ThumbnailUrl,
    string? Description,
    string DesignType,
    bool IsFeatured,
    int UsageCount,
    string JsonContent,
    DateTime CreatedAt
);
