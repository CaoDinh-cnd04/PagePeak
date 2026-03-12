namespace LadiPage.Application.Features.Pages;

public record PageElementDto(
    long Id,
    long SectionId,
    string Type,
    int Order,
    int X,
    int Y,
    int? Width,
    int? Height,
    int ZIndex,
    double Rotation,
    double Opacity,
    bool IsLocked,
    bool IsHidden,
    string? Content,
    string? Href,
    string? Target,
    string? ImageUrl,
    string? VideoUrl,
    string StylesJson
);

public record PageSectionDto(
    long Id,
    long PageId,
    int Order,
    string? Name,
    string? BackgroundColor,
    string? BackgroundImageUrl,
    int? Height,
    bool IsVisible,
    bool IsLocked,
    string? CustomClass,
    IReadOnlyList<PageElementDto> Elements
);

public record PageContentDto(
    long PageId,
    long WorkspaceId,
    string Name,
    string Slug,
    string Status,
    string? MetaTitle,
    string? MetaDescription,
    string PageType,
    bool MobileFriendly,
    IReadOnlyList<PageSectionDto> Sections
);
