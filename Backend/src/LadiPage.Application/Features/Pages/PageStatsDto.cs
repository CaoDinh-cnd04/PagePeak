namespace LadiPage.Application.Features.Pages;

public record PageStatsDto(
    long PageId,
    string PageName,
    long ViewCount,
    long ConversionCount,
    DateTime? LastViewedAt
);
