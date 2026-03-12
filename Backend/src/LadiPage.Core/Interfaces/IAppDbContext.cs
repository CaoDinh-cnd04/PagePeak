using LadiPage.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Core.Interfaces;

public interface IAppDbContext
{
    DbSet<Plan> Plans { get; }
    DbSet<User> Users { get; }
    DbSet<Session> Sessions { get; }
    DbSet<PlanSubscription> PlanSubscriptions { get; }
    DbSet<Workspace> Workspaces { get; }
    DbSet<WorkspaceMember> WorkspaceMembers { get; }
    DbSet<Template> Templates { get; }
    DbSet<Page> Pages { get; }
    DbSet<PageSection> PageSections { get; }
    DbSet<PageElement> PageElements { get; }
    DbSet<ToolCategory> ToolCategories { get; }
    DbSet<ToolItem> ToolItems { get; }
    DbSet<ElementPreset> ElementPresets { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
