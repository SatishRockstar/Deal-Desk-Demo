using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using System.Net.Http;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.WebUtilities;

namespace HeroBot.Services
{
    public class DocumentService : IDocumentService
    {
        public async Task<JObject> GetContractList(string type)
        {
            var GetUserApiToken = "IG08Bg6dvBzXsGfQFxxkRVSJId0QfFowTs5LRFVVgAkJRVY7uhO2s/vrl+j33V/9ll5dSTRPMTGkzqdpmVzNAgrjCEJlFYb7DCOBAcb3fzUe+oAFmHtBFYSpIQp6tW+dl41iCNNCHr/BPKbthsc2VinaM9/5H8BFC+jeu3EBZbA6KcExQHmN0O/vmf4Xf6HJdfspOOTOLhS1RdgfYg79RfaDJK9nsyPh7PuM6YjRXUsR7f3WY9YeYh6ReVKJgk3pPphTiVahvYUQfJyJ0ofO18t82bR7hjQWgZKgmD3Lo6tk8Oibpz04wzt7f+0owhRAtVA0rX/tVE4FWRZV8LN6DA==$vnsC9aADgkTIVKYtSwVFk/tW3FyV/fIpulKy6rCqXFDS11ZBi69Sq026AUnS6fb0aS5TytXS9vGIo5dgk2K9yznRCW7siIZ+rcnLzkQ3Aboe5KvWgXJhY/kdBBIbdTvZjJaqujoOR/sPUraX3b3/ONXgwCn2KA7Wj7Mp9ykn5pM=$Ic5HYSGHPuDwTlzHtGmSSE78V74Y81EeE8pWNGB3N2WTq9ZhSmdNMC5LkeHOKTUX/NSeSyFtorEQOIf3xHyesQ==$ZWA5DWQ0Bqpg2sx454hMX0HihhDA+HcrJ02Z1SpayTXp79gY1QhlVgYPNLtnpS5YJVu1JklyWLzkRYhoOqLq3A==";

            //  var certificateThumbprint = "6936E2B92F1B8FB13E7131CF136E24E023FA3F79";
            var bapiURL = "https://abbviefranceupgrade-business-api.icertis.com/api/v1/";
            //var store = new X509Store(StoreLocation.CurrentUser);
            //store.Open(OpenFlags.ReadOnly);
            //var certificates = store.Certificates.Find(X509FindType.FindByThumbprint, certificateThumbprint, true);
            //if (certificates.Count <= 0)
            //    throw new Exception($"No certificate found in current user's store with thumbprint: {certificateThumbprint}");
            //var cert = Certificates.Certificate.Get();

            var handler = new HttpClientHandler();
            //handler.ClientCertificates.Add(cert);
            handler.ServerCertificateCustomValidationCallback = delegate { return true; };
            //handler.ServerCertificateValidationCallback = delegate { return true; };
            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls11 | System.Net.SecurityProtocolType.Tls12;
            var content = new Dictionary<string, string>();
            //content.Add("filter", "Identifier $eq 5");
            //content.Add("Status", "Executed");
            content.Add("PageSize", "5");

            HttpClient _client = new HttpClient(handler)
                {
                    BaseAddress = new Uri(bapiURL)
                };
                _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                _client.DefaultRequestHeaders.Add("IcmAuthToken", GetUserApiToken);
            //HttpClient _client = new HttpClient(handler)
            //{
            //    BaseAddress = new Uri(bapiURL)
            //};
            //_client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            var api = $"agreements/{type}";
            var output = await _client.GetAsync(QueryHelpers.AddQueryString(api, content));
            var response = "";
            if (output.IsSuccessStatusCode)
            {
                response = await output.Content.ReadAsStringAsync();
            }
            // var output = _client.PostAsync(api,null);
            //  var response = output.GetAwaiter().GetResult();

            return JObject.Parse(response);
        }
    }
}
