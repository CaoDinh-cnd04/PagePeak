namespace LadiPage.Api.Models;

public class WorkspaceGeneralBody
{
    public string AccountName { get; set; } = "";
    public string StoreName { get; set; } = "";
    public string StoreAddress { get; set; } = "";
    public string StorePhone { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string Country { get; set; } = "";
    public string Province { get; set; } = "";
    public string District { get; set; } = "";
    public string Ward { get; set; } = "";
    public string Timezone { get; set; } = "";
    public string Currency { get; set; } = "";
}
