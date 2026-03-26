namespace LadiPage.Api.Models;

public record RegisterRequest(string Email, string Password, string FullName, string? Phone, string? RecaptchaToken);
public record RecaptchaResponse(bool Success);
public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record RevokeTokenRequest(string RefreshToken);
public record ExternalRegisterRequest(string Token, string? Phone, string? WorkspaceName);
public record UpdateProfileRequest(string? FullName, string? Phone, string? AvatarUrl);
public record UpgradePlanRequest([property: System.Text.Json.Serialization.JsonPropertyName("planId")] int PlanId);
public record ChangePasswordRequest(
    [property: System.Text.Json.Serialization.JsonPropertyName("currentPassword")] string CurrentPassword,
    [property: System.Text.Json.Serialization.JsonPropertyName("newPassword")] string NewPassword);
public record ResendVerificationRequest(string Email);

public record CreateWorkspaceRequest(string Name, string Slug);
public record CreatePageRequest(long WorkspaceId, string Name, string Slug, long? TemplateId);
public record UpdatePageRequest(string Name, string Slug);

public record CreateTagRequest(long WorkspaceId, string Name, string? Color);
public record UpdateTagRequest(string? Name, string? Color);
public record BulkDeleteTagsRequest([property: System.Text.Json.Serialization.JsonPropertyName("ids")] long[]? Ids);
public record SyncPageTagsRequest([property: System.Text.Json.Serialization.JsonPropertyName("tagIds")] long[]? TagIds);

public record CreateDomainRequest(long WorkspaceId, string DomainName);

public record CreateFormRequest(long WorkspaceId, string Name, string? FieldsJson, string? WebhookUrl, bool EmailNotify);
public record UpdateFormRequest(string? Name, string? FieldsJson, string? WebhookUrl, bool EmailNotify);

public record CreateProductRequest(long WorkspaceId, string Name, decimal Price, decimal? SalePrice, string? Description, string? ImageUrl, string? Category, int Stock);
public record UpdateProductRequest(string? Name, decimal? Price, decimal? SalePrice, string? Description, string? ImageUrl, string? Category, int? Stock, string? Status);

public record CreateOrderRequest(long WorkspaceId, string CustomerName, string? Email, string? Phone, long? ProductId, decimal Amount);
public record UpdateOrderRequest(string? CustomerName, string? Email, string? Phone, string? Status);

public record CreateCustomerRequest(long WorkspaceId, string Name, string? Email, string? Phone, string? Group, string? Source);
public record UpdateCustomerRequest(string? Name, string? Email, string? Phone, string? Group, string? Source);

public record SectionTemplateCreateDto(string Name, string JsonContent, string? PreviewUrl);
