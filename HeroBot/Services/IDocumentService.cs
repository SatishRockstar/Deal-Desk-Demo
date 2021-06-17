using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HeroBot.Services
{
    public interface IDocumentService
    {
        Task<JObject> GetContractList(string type);
    }
}
