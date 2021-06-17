using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Azure;
using Azure.Communication;
using Azure.Communication.Identity;
using Azure.Core;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace HeroBot.Controllers
{
    [Route("call")]
    public class CallUserTokenController: Controller
    {
        private readonly CommunicationIdentityClient _client;

        public CallUserTokenController(IConfiguration configuration)
        {
            _client = new CommunicationIdentityClient(configuration["ResourceConnectionString"]);
        }

        /// <summary>
        /// Gets a token to be used to initalize the call client
        /// </summary>
        /// <returns></returns>
        [Route("token")]
        [HttpGet]
        public async Task<IActionResult> GetAsync()
        {
            try
            {
                //Response<(CommunicationUserIdentifier User, AccessToken Token)> response = await _client.CreateUserWithTokenAsync(scopes: new[] { CommunicationTokenScope.VoIP });
                var response = await _client.CreateUserAndTokenAsync(scopes: new[] { CommunicationTokenScope.VoIP });

                var responseValue = response.Value;

                var jsonFormattedUser = new
                {
                    communicationUserId = responseValue.User.Id
                };

                var clientResponse = new
                {
                    user = jsonFormattedUser,
                    //token = responseValue.Token.Token,
                    token = responseValue.AccessToken.Token,
                    //expiresOn = responseValue.Token.ExpiresOn
                    expiresOn = responseValue.AccessToken.ExpiresOn
                };

                return this.Ok(clientResponse);
            }
            catch (RequestFailedException ex)
            {
                Console.WriteLine($"Error occured while Generating Token: {ex}");
                return this.Ok(this.Json(ex));
            }
        }

        /// <summary>
        /// Gets a token to be used to initalize the call client
        /// </summary>
        /// <returns></returns>
        [Route("/refreshToken/{identity}")]
        [HttpGet]
        public async Task<IActionResult> GetAsync(string identity)
        {
            try
            {
                CommunicationUserIdentifier identifier = new CommunicationUserIdentifier(identity);
                //Response<AccessToken> response = await _client.IssueTokenAsync(identifier, scopes: new[] { CommunicationTokenScope.VoIP });
                Response<AccessToken> response = await _client.GetTokenAsync(identifier, scopes: new[] { CommunicationTokenScope.VoIP });

                var responseValue = response.Value;
                var clientResponse = new
                {
                    token = responseValue.Token,
                    expiresOn = responseValue.ExpiresOn
                };

                return this.Ok(clientResponse);
            }
            catch (RequestFailedException ex)
            {
                Console.WriteLine($"Error occured while Generating Token: {ex}");
                return this.Ok(this.Json(ex));
            }
        }
    }
}
