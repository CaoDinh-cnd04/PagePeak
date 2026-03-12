using MediatR;

namespace LadiPage.Application.Features.Pages;

public record GetPageContentQuery(long PageId) : IRequest<PageContentDto?>;

