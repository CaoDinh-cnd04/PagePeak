using FluentValidation;

namespace LadiPage.Application.Features.Workspaces;

public class CreateWorkspaceCommandValidator : AbstractValidator<CreateWorkspaceCommand>
{
    public CreateWorkspaceCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug).NotEmpty().MaximumLength(100).Matches("^[a-z0-9-]+$").WithMessage("Slug must be lowercase alphanumeric and hyphens only.");
    }
}
