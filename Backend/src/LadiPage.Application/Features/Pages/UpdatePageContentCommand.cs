using MediatR;

namespace LadiPage.Application.Features.Pages;

public record UpdatePageContentCommand(long PageId, PageContentDto Content) : IRequest<bool>;

