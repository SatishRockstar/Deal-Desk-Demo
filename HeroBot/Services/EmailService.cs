using SendGrid;
using SendGrid.Helpers.Mail;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Net.Mime;
using System.Threading.Tasks;

namespace HeroBot.Services
{
    public class EmailService : IEmailService
    {
        public async Task Send(string EmailTo, string Message, string Subject)
        {
            try
            {
                var apiKey = "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";
                var client = new SendGridClient(apiKey);
                var from = new EmailAddress("satish.shinde@cognologix.com", "Icertis Deal Desk");
                var subject = Subject;
                var to = new EmailAddress(EmailTo, "Rahul Saraf");
                var plainTextContent = "";
                var htmlContent = Message;
                var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent, htmlContent);
                var response = await client.SendEmailAsync(msg);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }
    }
}
