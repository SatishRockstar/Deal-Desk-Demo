using System;
using Azure.Communication;

namespace HeroBot.Models
{
    public class ClientChatMessage
    {
        public string ClientMessageId { get; set; }
        public Sender? Sender { get; set; }
        public string SenderDisplayName { get; set; }
        public MessageContent Content { get; set; }
        public DateTime CreatedOn { get; set; }
        public string Id { get; set; }
        public bool? Failed { get; set; }
        public string ChatUrl { get; set; }
    }

    public class MessageContent
    {
        public string Message { get; set; }
    }

    public class Sender
    {
        public string Kind { get; set; }
        public string CommunicationUserId { get; set; }
    }
}