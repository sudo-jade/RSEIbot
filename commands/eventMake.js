const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Client, Message, MessageReaction } = require('discord.js');
const dayjs = require('dayjs');
const settings = require("../settings.json");
const reactDescription = "🤝:Setup, 😲: Attended, 🔇: Cleanup"
// No, I could not fin
/**
 * @param {Message} message 
 * @param {String} emoji 
 * @param {String} title - Setup, Attened, or Cleanup 
 * @param {Client} client
 * @description Gives the line for stats and unreacts. Begins with '\n' or is empty.
 */
async function statLine(message, emoji, title, client){try{
    let members = [];
    // There should be at least one reaction here at this point, specifically the bot
    let reactionUserManager = await message.reactions.resolve(emoji).users;
    // I'm not sure what happens if you remove the client reaction and it is the only one
    // so let's just get the members and filter it out
    let reactionUsers = await reactionUserManager.fetch();
    for (let user of reactionUsers){
        // user[0]: ID. We want to exclude the bot
        if (user[0]!=client.user.id){
            let gm = await message.guild.members.fetch(user[0]);
            if (gm.nickname){
                members.push(gm.nickname)
            }
            else {members.push(gm.displayName)}

        }
    }
    // Remove the bot reaction (looks nicer)
    reactionUserManager.remove(client.user)
    if (members.length > 0){return `\n${title}: ${members.join(", ")}`}
    else {return '';}
}catch(er){console.log(er); return ''}}
/**
 * @param {Object} info - Stores the data to update event stats 
 * @param {String} info.pollId - Message Id of poll
 * @param {String} info.pollChannel - Channel Id of poll
 * @param {String} info.event - title of event
 * @param {String} info.replyId - Message Id of output
 * @param {Client} info.client - Our client
 */
async function showStats(info){try{
    // I could use then chains but I didn't want to
    let pollChannel = await info.client.channels.fetch(info.pollChannel);
    let pollMessage = await pollChannel.messages.fetch(info.pollId);
    // Edit to poll to be over
    pollMessage.edit({embeds: [new EmbedBuilder().setTitle(info.event).setDescription("Reactions Closed\n🤝:Setup, 😲: Attended, 🔇: Cleanup\nCheck pins to have activity recorded").setColor(parseInt("b40000",16))]});
    // Guess what these lines do
    let partData = "";
    partData += await statLine(pollMessage, "🤝", "Setup", info.client);
    partData += await statLine(pollMessage, "😲", "Attended", info.client);
    partData += await statLine(pollMessage, "🔇", "Cleanup", info.client);

    let outChannel = await info.client.channels.fetch(settings.outChannel);
    let outMessage = await outChannel.messages.fetch(info.replyId);
    outMessage.edit(`${info.event}\n---${partData}`);
}catch(er){console.log(er)}}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('event').setDescription("Make 24 hour poll")
        // Event name
        .addStringOption(
            option=>option.setName('name')
            .setDescription("Name of Event")
            .setRequired(true))
        .addStringOption(
            option=>option.setName('date')
            .setRequired(true).setDescription('Date of Event')
        ),
        /**
         * 
         * @param {ChatInputCommandInteraction} interaction 
         */
	async execute(interaction) {
		await interaction.reply({ content: 'Making event in current channel', ephemeral: true });
        
        const eventTitle = interaction.options.getString('name') + " - " + interaction.options.getString('date');
        var poll = await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle(eventTitle).setDescription(reactDescription).setColor(parseInt("f45539",16))]});
        poll.react('🤝')
        poll.react('😲')
        poll.react('🔇')
        // Get time for output
        var now = dayjs();
        // Add one extra minute so it WILL be ready
        var release = now.add(settings.minWait + 1, 'minute');
        var releaseDate = release.format('*dddd MMM D @ h:mma*');
        // Send output
        var outChannel = await interaction.client.channels.fetch(settings.outChannel);
        var reply = await outChannel.send(interaction.options.getString('name') + " participation: \n Available " + releaseDate);
        // Get our wait
        setTimeout(showStats, 60 * 1000 * settings.minWait, {
            pollId: poll.id, 
            pollChannel: interaction.channelId,
            event: eventTitle,
            replyId: reply.id,
            client: interaction.client})
	},
};