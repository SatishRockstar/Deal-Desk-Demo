using System;
using System.Threading.Tasks;
using Azure.Communication.Identity;
using Azure.Core;

namespace HeroBot.TokenManagement
{
    public interface IUserTokenManager
    {
        Task<CommunicationUserIdentifierAndToken> GenerateTokenAsync(string resourceConnectionString);
        Task<AccessToken> GenerateTokenAsync(string resourceConnectionString, string identity);
        Task<AccessToken> RefreshTokenAsync(string resourceConnectionString, string expiredToken);
    }
}
