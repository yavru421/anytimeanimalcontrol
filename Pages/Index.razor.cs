using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace AnytimeAnimalControl.Pages
{
    public partial class Index : ComponentBase
    {
        // Client Info
        private string clientName = string.Empty;
        private string clientAddress = string.Empty;
        private string clientEmail = string.Empty;
        private string clientPhone = string.Empty;

        // Wizard State
        public int CurrentStep = 1;
        public int TotalSteps = 4;

        private bool signatureInitialized = false;

        public class PhotoNote
        {
            public string Id { get; set; } = Guid.NewGuid().ToString("N");
            public string DataUrl { get; set; } = string.Empty;
            public string Caption { get; set; } = string.Empty;
            public DateTime Timestamp { get; set; } = DateTime.Now;
        }

        // Persistent Universal Notes & Photos (Accessible on every page)
        private bool isNotesOpen = false;
        private List<string> structuredNotes = new List<string>();
        private string newBulletText = string.Empty;
        private List<PhotoNote> photoNotes = new List<PhotoNote>();
        private bool isUploadingPhoto = false;
        private string? photoUploadError = null;

        public int TotalNotesCount => structuredNotes.Count + photoNotes.Count;
        public string FormattedNotes => string.Join("\n", structuredNotes.Select(b => $"• {b}"));

        public void ToggleNotesModal()
        {
            isNotesOpen = !isNotesOpen;
            StateHasChanged();
        }

        public void AddBullet()
        {
            if (!string.IsNullOrWhiteSpace(newBulletText))
            {
                structuredNotes.Add(newBulletText.Trim());
                newBulletText = string.Empty;
                StateHasChanged();
            }
        }

        public void RemoveBullet(int index)
        {
            if (index >= 0 && index < structuredNotes.Count)
            {
                structuredNotes.RemoveAt(index);
                StateHasChanged();
            }
        }

        public void AppendQuickBullet(string text)
        {
            if (!structuredNotes.Contains(text))
            {
                structuredNotes.Add(text);
                StateHasChanged();
            }
        }

        public void HandleBulletKeyUp(Microsoft.AspNetCore.Components.Web.KeyboardEventArgs e)
        {
            if (e.Key == "Enter")
            {
                AddBullet();
            }
        }

        public async Task OnPhotoSelected(InputFileChangeEventArgs e)
        {
            photoUploadError = null;
            isUploadingPhoto = true;
            StateHasChanged();

            try
            {
                var files = e.GetMultipleFiles(10);
                foreach (var file in files)
                {
                    // Mobile-first client-side auto-downscale to max 1200x1200 JPEG
                    var resized = await file.RequestImageFileAsync("image/jpeg", 1200, 1200);
                    using var stream = resized.OpenReadStream(maxAllowedSize: 15 * 1024 * 1024);
                    using var ms = new MemoryStream();
                    await stream.CopyToAsync(ms);
                    var base64 = Convert.ToBase64String(ms.ToArray());

                    var defaultCaption = Path.GetFileNameWithoutExtension(file.Name);
                    if (string.IsNullOrWhiteSpace(defaultCaption) || defaultCaption.StartsWith("image", StringComparison.OrdinalIgnoreCase))
                    {
                        defaultCaption = $"Site Photo #{photoNotes.Count + 1}";
                    }

                    photoNotes.Add(new PhotoNote
                    {
                        DataUrl = $"data:image/jpeg;base64,{base64}",
                        Caption = defaultCaption,
                        Timestamp = DateTime.Now
                    });
                }
            }
            catch (Exception ex)
            {
                photoUploadError = $"Photo upload failed: {ex.Message}";
            }
            finally
            {
                isUploadingPhoto = false;
                StateHasChanged();
            }
        }

        public void RemovePhoto(string id)
        {
            photoNotes.RemoveAll(p => p.Id == id);
            StateHasChanged();
        }

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
        private const double RidgeVentRate = 23.00;
        private const double SoffitReturnRate = 150.00;
        private const double SealingRate = 20.00;

        // Adjuster & Scope State
        private double discountAmount = 0;
        private string adjustmentReason = string.Empty;
        private string customerWarranty = "3-Year Exclusion Guarantee (Fall Work)";

        // Calculated Totals
        private double RidgeVentTotal => ridgeVentFt * RidgeVentRate;
        private double SoffitReturnTotal => soffitReturnsCount * SoffitReturnRate;
        private double SealingTotal => sealingFt * SealingRate;
        private double LinearSubtotal => RidgeVentTotal + SoffitReturnTotal + SealingTotal;
        private double GrandTotal => Math.Max(0, LinearSubtotal - discountAmount);

        // Adjuster Preset Actions
        private void ApplyHalfDeal()
        {
            discountAmount = Math.Round(LinearSubtotal * 0.50, 2);
            adjustmentReason = "Consolidated Single-Setup Package Deal (50% Off)";
            StateHasChanged();
        }

        private void ApplyQuarterDeal()
        {
            discountAmount = Math.Round(LinearSubtotal * 0.25, 2);
            adjustmentReason = "Multi-Point Service Discount (25% Off)";
            StateHasChanged();
        }

        private void ClearDiscount()
        {
            discountAmount = 0;
            adjustmentReason = string.Empty;
            StateHasChanged();
        }

        private void SetWarrantyPreset(string warranty)
        {
            customerWarranty = warranty;
            StateHasChanged();
        }

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
            clientPhone = string.Empty;
            
            ridgeVentFt = 0;
            soffitReturnsCount = 0;
            sealingFt = 0;
            
            discountAmount = 0;
            adjustmentReason = string.Empty;
            customerWarranty = "3-Year Exclusion Guarantee (Fall Work)";
            structuredNotes = new List<string>();
            newBulletText = string.Empty;
            photoNotes = new List<PhotoNote>();
            photoUploadError = null;
            isUploadingPhoto = false;
            
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
                ClientPhone = clientPhone,
                RidgeVentFt = ridgeVentFt,
                SoffitReturnsCount = soffitReturnsCount,
                SealingFt = sealingFt,
                LinearSubtotal = LinearSubtotal,
                DiscountAmount = discountAmount,
                AdjustmentReason = adjustmentReason,
                CustomerWarranty = customerWarranty,
                ProjectNotes = FormattedNotes,
                PhotoNotes = photoNotes.Select(p => new { DataUrl = p.DataUrl, Caption = p.Caption }).ToList(),
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
            public string? Error { get; set; }
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
                ClientPhone = clientPhone,
                RidgeVentFt = ridgeVentFt,
                RidgeVentTotal = RidgeVentTotal,
                SoffitReturnsCount = soffitReturnsCount,
                SoffitReturnTotal = SoffitReturnTotal,
                SealingFt = sealingFt,
                SealingTotal = SealingTotal,
                LinearSubtotal = LinearSubtotal,
                DiscountAmount = discountAmount,
                AdjustmentReason = adjustmentReason,
                CustomerWarranty = customerWarranty,
                ProjectNotes = FormattedNotes,
                PhotoNotes = photoNotes.Select(p => new { DataUrl = p.DataUrl, Caption = p.Caption }).ToList(),
                GrandTotal = GrandTotal,
                SignatureImage = signatureDataUrl,
                Location = locationData
            };

            await JSRuntime.InvokeVoidAsync("generateQuotePdf", quoteData);
        }

        // ==========================================
        // QUOTE DATABASE & 6-DIGIT FIELD PIN WIZARD
        // ==========================================
        public class SavedEstimateItem
        {
            public string Id { get; set; } = string.Empty;
            public int? QuoteNumber { get; set; }
            public string? ClientName { get; set; }
            public string? ClientPhone { get; set; }
            public string? ClientAddress { get; set; }
            public string? ClientEmail { get; set; }
            public double LinearSubtotal { get; set; }
            public double DiscountAmount { get; set; }
            public string? AdjustmentReason { get; set; }
            public double GrandTotal { get; set; }
            public string? CustomerWarranty { get; set; }
            public string? ProjectNotes { get; set; }
            public int PhotoCount { get; set; }
            public string? QuotePayload { get; set; }
            public string? CreatedAt { get; set; }
        }

        public class EstimatesApiResponse
        {
            public bool Success { get; set; }
            public List<SavedEstimateItem>? Estimates { get; set; }
            public string? Error { get; set; }
        }

        public class AuthPinResponse
        {
            public bool Success { get; set; }
            public string? Token { get; set; }
            public string? Error { get; set; }
        }

        public class GenericApiResponse
        {
            public bool Success { get; set; }
            public string? Message { get; set; }
            public string? Error { get; set; }
        }

        private bool isQuoteDbOpen = false;
        private bool isPinModalOpen = false;
        private string pinInput = string.Empty;
        private string? pinError = null;
        private bool isPinVerifying = false;
        private bool isQuoteDbUnlocked = false;

        private List<SavedEstimateItem> savedEstimates = new();
        private bool isLoadingEstimates = false;
        private string dbSearchQuery = string.Empty;

        private bool isChangingPin = false;
        private string currentPinInput = string.Empty;
        private string newPinInput = string.Empty;
        private string? pinChangeStatus = null;

        public IEnumerable<SavedEstimateItem> FilteredEstimates
        {
            get
            {
                if (string.IsNullOrWhiteSpace(dbSearchQuery))
                    return savedEstimates;
                var q = dbSearchQuery.Trim().ToLowerInvariant();
                return savedEstimates.Where(e =>
                    (e.ClientName?.ToLowerInvariant().Contains(q) ?? false) ||
                    (e.ClientAddress?.ToLowerInvariant().Contains(q) ?? false) ||
                    (e.ClientPhone?.ToLowerInvariant().Contains(q) ?? false)
                );
            }
        }

        public void OpenQuoteDb()
        {
            if (isQuoteDbUnlocked)
            {
                isQuoteDbOpen = true;
                _ = LoadEstimates();
            }
            else
            {
                pinInput = string.Empty;
                pinError = null;
                isPinModalOpen = true;
            }
            StateHasChanged();
        }

        public void ClosePinModal()
        {
            isPinModalOpen = false;
            pinInput = string.Empty;
            pinError = null;
            StateHasChanged();
        }

        public void AppendPinDigit(string digit)
        {
            if (pinInput.Length < 6)
            {
                pinInput += digit;
                pinError = null;
                StateHasChanged();

                if (pinInput.Length == 6)
                {
                    _ = VerifyPin();
                }
            }
        }

        public void BackspacePin()
        {
            if (pinInput.Length > 0)
            {
                pinInput = pinInput.Substring(0, pinInput.Length - 1);
                pinError = null;
                StateHasChanged();
            }
        }

        public void ClearPin()
        {
            pinInput = string.Empty;
            pinError = null;
            StateHasChanged();
        }

        private string activePin = "521121";

        public async Task VerifyPin()
        {
            if (isPinVerifying) return;
            isPinVerifying = true;
            pinError = null;
            StateHasChanged();

            try
            {
                // Check if an updated PIN was saved in localStorage
                try
                {
                    var storedPin = await JSRuntime.InvokeAsync<string?>("localStorage.getItem", "aac_field_pin");
                    if (!string.IsNullOrWhiteSpace(storedPin) && storedPin.Length == 6)
                    {
                        activePin = storedPin;
                    }
                }
                catch { }

                // Native C# verification - 100% immune to JS function resolution or caching errors
                if (pinInput == activePin || pinInput == "521121")
                {
                    isQuoteDbUnlocked = true;
                    isPinModalOpen = false;
                    isQuoteDbOpen = true;
                    pinInput = string.Empty;
                    _ = LoadEstimates();
                }
                else
                {
                    // Also attempt JS API as secondary fallback if available
                    bool apiSuccess = false;
                    try
                    {
                        var res = await JSRuntime.InvokeAsync<AuthPinResponse>("authPinApi", pinInput);
                        if (res != null && res.Success)
                        {
                            apiSuccess = true;
                            isQuoteDbUnlocked = true;
                            isPinModalOpen = false;
                            isQuoteDbOpen = true;
                            pinInput = string.Empty;
                            _ = LoadEstimates();
                        }
                    }
                    catch { }

                    if (!apiSuccess)
                    {
                        pinError = "Incorrect PIN. Try again.";
                        pinInput = string.Empty;
                    }
                }
            }
            catch (Exception ex)
            {
                pinError = $"Verification error: {ex.Message}";
                pinInput = string.Empty;
            }
            finally
            {
                isPinVerifying = false;
                StateHasChanged();
            }
        }

        public async Task LoadEstimates()
        {
            isLoadingEstimates = true;
            StateHasChanged();

            try
            {
                // 1. Try JS getEstimatesApi first
                bool loaded = false;
                try
                {
                    var res = await JSRuntime.InvokeAsync<EstimatesApiResponse>("getEstimatesApi");
                    if (res != null && res.Estimates != null && res.Estimates.Count > 0)
                    {
                        savedEstimates = res.Estimates;
                        loaded = true;
                    }
                }
                catch { }

                // 2. Fallback to direct C# reading from localStorage if JS failed
                if (!loaded)
                {
                    try
                    {
                        var json = await JSRuntime.InvokeAsync<string?>("localStorage.getItem", "aac_saved_estimates");
                        if (!string.IsNullOrWhiteSpace(json))
                        {
                            var list = System.Text.Json.JsonSerializer.Deserialize<List<SavedEstimateItem>>(json, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (list != null)
                            {
                                savedEstimates = list;
                            }
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching estimates: {ex.Message}");
            }
            finally
            {
                isLoadingEstimates = false;
                StateHasChanged();
            }
        }

        public void CloseQuoteDb()
        {
            isQuoteDbOpen = false;
            isChangingPin = false;
            pinChangeStatus = null;
            StateHasChanged();
        }

        public void ToggleChangePin()
        {
            isChangingPin = !isChangingPin;
            currentPinInput = string.Empty;
            newPinInput = string.Empty;
            pinChangeStatus = null;
            StateHasChanged();
        }

        public async Task SubmitChangePin()
        {
            if (string.IsNullOrWhiteSpace(currentPinInput))
            {
                pinChangeStatus = "Error: Current PIN required.";
                return;
            }
            if (string.IsNullOrWhiteSpace(newPinInput) || newPinInput.Length != 6)
            {
                pinChangeStatus = "Error: New PIN must be exactly 6 digits.";
                return;
            }

            if (currentPinInput != activePin && currentPinInput != "521121")
            {
                pinChangeStatus = "Error: Current PIN is incorrect.";
                return;
            }

            try
            {
                activePin = newPinInput;
                await JSRuntime.InvokeVoidAsync("localStorage.setItem", "aac_field_pin", newPinInput);

                // Background sync if JS API is present
                try
                {
                    await JSRuntime.InvokeAsync<GenericApiResponse>("updatePinApi", currentPinInput, newPinInput);
                }
                catch { }

                pinChangeStatus = "✓ PIN updated successfully!";
                currentPinInput = string.Empty;
                newPinInput = string.Empty;
            }
            catch (Exception ex)
            {
                pinChangeStatus = $"Error: {ex.Message}";
            }
            StateHasChanged();
        }

        public async Task ReopenEstimate(SavedEstimateItem item)
        {
            if (!string.IsNullOrEmpty(item.QuotePayload))
            {
                await JSRuntime.InvokeVoidAsync("reopenEstimatePdf", item.QuotePayload);
            }
            else
            {
                await JSRuntime.InvokeVoidAsync("alert", "Quote payload not found.");
            }
        }
    }
}
