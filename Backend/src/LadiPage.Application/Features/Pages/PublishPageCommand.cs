using MediatR;

namespace LadiPage.Application.Features.Pages;

public record PublishPageCommand(long PageId) : IRequest<PublishPageResult>;

public record PublishCheckItem(string Key, bool Passed, string Message);

public record PublishPageResult(
    bool Success,
    string? Error,
    List<PublishCheckItem> Checks
);
