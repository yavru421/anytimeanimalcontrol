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

        // Wizard State
        public int CurrentStep = 1;
        public int TotalSteps = 4;

        private bool signatureInitialized = false;

        public void NextStep() 
        { 
            if (CurrentStep < TotalSteps) 
                CurrentStep++; 
        }

        public void PrevStep() 
        { 
            if (CurrentStep > 1) 
                CurrentStep--; 
        }

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
            if (CurrentStep == TotalSteps && !signatureInitialized)
            {
                await JSRuntime.InvokeVoidAsync("initSignaturePad", "signatureCanvas");
                signatureInitialized = true;
            }
            else if (CurrentStep != TotalSteps && signatureInitialized)
            {
                signatureInitialized = false; // reset so it re-inits if we go back and forth
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

        public class GeolocationResult
        {
            public double Lat { get; set; }
            public double Lng { get; set; }
            public double Accuracy { get; set; }
            public string Error { get; set; }
        }

        private async Task GenerateQuote()
        {
            var signatureDataUrl = await JSRuntime.InvokeAsync<string>("getSignatureData", "signatureCanvas");
            var locationData = await JSRuntime.InvokeAsync<GeolocationResult>("getGeolocation");
            
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
                SignatureImage = signatureDataUrl,
                Location = locationData
            };

            await JSRuntime.InvokeVoidAsync("generateQuotePdf", quoteData);
        }
    }
}
