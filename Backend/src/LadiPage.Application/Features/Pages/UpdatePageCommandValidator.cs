using FluentValidation;

namespace LadiPage.Application.Features.Pages;

public class UpdatePageCommandValidator : AbstractValidator<UpdatePageCommand>
{
    public UpdatePageCommandValidator()
    {
        RuleFor(x => x.PageId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug).NotEmpty().MaximumLength(150);
    }
}
