using MediatR;

namespace LadiPage.Application.Features.Pages;

public record DuplicatePageCommand(long PageId) : IRequest<PageDto?>;
