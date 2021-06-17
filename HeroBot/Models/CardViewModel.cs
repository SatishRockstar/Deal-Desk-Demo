using System;
using Newtonsoft.Json.Linq;

namespace HeroBot.Models
{
    public class CardViewModel
    {
        public JObject Template { get; set; }
        public JObject Data { get; set; }
    }
}
