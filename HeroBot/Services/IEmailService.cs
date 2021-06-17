using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HeroBot.Services
{
    public interface IEmailService
    {
        Task Send(string EmailTo, string Message, string Subject);
    }
}
