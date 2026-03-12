using FluentValidation;

namespace LadiPage.Application.Features.Pages;

public class CreatePageCommandValidator : AbstractValidator<CreatePageCommand>
{
    public CreatePageCommandValidator()
    {
        RuleFor(x => x.WorkspaceId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug).NotEmpty().MaximumLength(150);
    }
}

