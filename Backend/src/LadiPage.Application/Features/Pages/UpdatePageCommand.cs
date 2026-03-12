using MediatR;

namespace LadiPage.Application.Features.Pages;

public record UpdatePageCommand(long PageId, string Name, string Slug) : IRequest<PageDto?>;
