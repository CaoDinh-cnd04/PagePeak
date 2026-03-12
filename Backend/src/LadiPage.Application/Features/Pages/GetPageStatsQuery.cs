using MediatR;

namespace LadiPage.Application.Features.Pages;

public record GetPageStatsQuery(long PageId) : IRequest<PageStatsDto?>;
