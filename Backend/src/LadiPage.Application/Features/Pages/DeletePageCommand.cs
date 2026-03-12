using MediatR;

namespace LadiPage.Application.Features.Pages;

public record DeletePageCommand(long PageId) : IRequest<bool>;
