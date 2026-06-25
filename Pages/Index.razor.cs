using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using System.Threading.Tasks;

namespace AnytimeAnimalControl.Pages
{
    public partial class Index : ComponentBase
    {
        // Client Info
        private string clientName = string.Empty;
        private string clientAddress = string.Empty;
        private string clientEmail = string.Empty;

        // Calculator Inputs
        private double ridgeVentFt = 0;
        private int soffitReturnsCount = 0;
        private double sealingFt = 0;

        // Rates
        private const double RidgeVentRate = 12.50;
        private const double SoffitReturnRate = 45.00;
        private const double SealingRate = 8.75;

        // Notes
        private string projectNotes = string.Empty;

        // Calculated Totals
        private double RidgeVentTotal => ridgeVentFt * RidgeVentRate;
        private double SoffitReturnTotal => soffitReturnsCount * SoffitReturnRate;
        private double SealingTotal => sealingFt * SealingRate;
        private double GrandTotal => RidgeVentTotal + SoffitReturnTotal + SealingTotal;

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                await JSRuntime.InvokeVoidAsync("initSignaturePad", "signatureCanvas");
            }
        }

        private void CalculateTotal()
        {
            StateHasChanged();
        }

        private async Task ClearSignature()
        {
            await JSRuntime.InvokeVoidAsync("clearSignaturePad", "signatureCanvas");
        }

        private async Task ResetForm()
        {
            clientName = string.Empty;
            clientAddress = string.Empty;
            clientEmail = string.Empty;
            
            ridgeVentFt = 0;
            soffitReturnsCount = 0;
            sealingFt = 0;
            
            projectNotes = string.Empty;
            
            await ClearSignature();
            StateHasChanged();
        }

        private async Task SaveOffline()
        {
            var estimateData = new
            {
                ClientName = clientName,
                ClientAddress = clientAddress,
                ClientEmail = clientEmail,
                RidgeVentFt = ridgeVentFt,
                SoffitReturnsCount = soffitReturnsCount,
                SealingFt = sealingFt,
                ProjectNotes = projectNotes,
                Total = GrandTotal
            };

            await JSRuntime.InvokeVoidAsync("saveEstimateOffline", estimateData);
            await JSRuntime.InvokeVoidAsync("alert", "Estimate saved offline successfully!");
        }

        private async Task GenerateQuote()
        {
            var signatureDataUrl = await JSRuntime.InvokeAsync<string>("getSignatureData", "signatureCanvas");
            
            var quoteData = new
            {
                ClientName = clientName,
                ClientAddress = clientAddress,
                ClientEmail = clientEmail,
                RidgeVentFt = ridgeVentFt,
                RidgeVentTotal = RidgeVentTotal,
                SoffitReturnsCount = soffitReturnsCount,
                SoffitReturnTotal = SoffitReturnTotal,
                SealingFt = sealingFt,
                SealingTotal = SealingTotal,
                GrandTotal = GrandTotal,
                ProjectNotes = projectNotes,
                SignatureImage = signatureDataUrl
            };

            await JSRuntime.InvokeVoidAsync("generateQuotePdf", quoteData);
        }
    }
}
