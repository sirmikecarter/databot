const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog, ChoiceFactory, ChoicePrompt } = require('botbuilder-dialogs');
const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');

const { SearchFilterDialog } = require('./searchFilterDialog');
const { SearchDialog } = require('./searchDialog');
const { SelectReportDialog } = require('./selectReportDialog');
const { SelectReportResultDialog } = require('./selectReportResultDialog');
const { LuisHelper } = require('./luisHelper');
const { DialogHelper } = require('./dialogHelper');
const { LuisDialog } = require('./luisDialog');


const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const SEARCH_FILTER_DIALOG = 'searchFilterDialog';
const SEARCH_DIALOG = 'searchDialog';
const CHOICE_PROMPT = 'CHOICE_PROMPT';

const axios = require('axios');
const WelcomeCard = require('../bots/resources/welcomeCard.json');

class MainDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;

        this.state = {
          reportNameSearch: [],
          itemCount: '',
          reportname: '',
          description: '',
          owner: '',
          designee: '',
          approver: '',
          division: '',
          classification: '',
          language: '',
          entities: [],
          keyPhrases: [],
          sentiment: '',
          reportArray: [],
          reportArrayAnalytics: [],
          reportArrayFormData: [],
          reportArrayLanguage: [],
          reportArrayEntities: [],
          reportArrayKeyPhrases: [],
          reportArraySentiment: []
        };

        // search the index

        this.dialogHelper = new DialogHelper();
        this.luisDialog = new LuisDialog();
        this.selectReportDialog = new SelectReportDialog();
        this.selectReportResultDialog = new SelectReportResultDialog();

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new SearchFilterDialog(SEARCH_FILTER_DIALOG))
            .addDialog(new SearchDialog(SEARCH_DIALOG))
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.filterStep.bind(this),
                this.endDialogStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
     async run(turnContext, accessor) {
         const dialogSet = new DialogSet(accessor);
         dialogSet.add(this);

         const dialogContext = await dialogSet.createContext(turnContext);
         const results = await dialogContext.continueDialog();

         var self = this;

         if (turnContext.activity.value){
           // console.log(turnContext.activity.value)
           // console.log(turnContext.activity.value.value)
          if (turnContext.activity.value.report_name_selector_value){

            await this.selectReportResultDialog.onTurn(turnContext);
          }

         }else if(turnContext.activity.text === 'Select a Report by Report Name'  ){

           await this.selectReportDialog.onTurn(turnContext, accessor);

         }else if(turnContext.activity.text === 'How Do I Calculate the 2% Retirement Formula' ){

           await turnContext.sendActivity({ attachments: [this.dialogHelper.createGifCard()] });
           await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

           var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Search Options', 'Search with LUIS']);
           await turnContext.sendActivity(reply);

         }else if(turnContext.activity.text === 'Search Options' ){

           if (results.status === DialogTurnStatus.empty) {
               await dialogContext.beginDialog(this.id);
           }

         }else if(turnContext.activity.text === 'menu' || turnContext.activity.text === 'help'|| turnContext.activity.text === 'cancel'){
           const welcomeCard = CardFactory.adaptiveCard(WelcomeCard);
           await turnContext.sendActivity({ attachments: [welcomeCard] });
         }else if(turnContext.activity.text === 'Search with LUIS'){
           console.log('LUIS Search')

           await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...I understand complex search phrases','below are some phrases I understand and can find reports for:')] });

           var reply2 = MessageFactory.suggestedActions(['luis: Member account reports that are confidential','luis: Reports owned by Anthony', 'luis: Sensitive reports', 'LUIS Search Approved reports by John']);
           await turnContext.sendActivity(reply2);

         }else if(turnContext.activity.text.includes('LUIS Search') || turnContext.activity.text.includes('luis search') || turnContext.activity.text.includes('luis:')){

           await this.luisDialog.onTurn(turnContext);

         }

         if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
             // Handle ConversationUpdate activity type, which is used to indicates new members add to
             // the conversation.
             // see https://aka.ms/about-bot-activity-message to learn more about the message and other activity types

             // Do we have any new members added to the conversation?
             if (turnContext.activity.membersAdded.length !== 0) {
                 // Iterate over all new members added to the conversation

                 for (var idx in turnContext.activity.membersAdded) {
                     // Greet anyone that was not the target (recipient) of this message
                     // the 'bot' is the recipient for events from the channel,
                     // turnContext.activity.membersAdded == turnContext.activity.recipient.Id indicates the
                     // bot was added to the conversation.
                     if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                         // Welcome user.
                         // When activity type is "conversationUpdate" and the member joining the conversation is the bot
                         // we will send our Welcome Adaptive Card.  This will only be sent once, when the Bot joins conversation
                         // To learn more about Adaptive Cards, see https://aka.ms/msbot-adaptivecards for more details.
                         //await turnContext.sendActivity(`Hello, this is R2-D2 - your virtual assistant.`);
                         //await turnContext.sendActivity(`I can help you submit a Request for Architecture Work (RAW), check the weather forecast, answer your questions about CalPERS or even carry on a converstation with you`);
                         //await turnContext.sendActivity(`What can I help with you today?`);
 
                         await turnContext.sendActivity({
                             //text: '',
                             attachments: [CardFactory.adaptiveCard(WelcomeCard)]
                           });



                     }
                 }
             }
         }

     }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(stepContext) {
        if (!process.env.LuisAppId || !process.env.LuisAPIKey || !process.env.LuisAPIHostName) {
            await stepContext.context.sendActivity('NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.');
            return await stepContext.next();
        }

        return await stepContext.prompt(CHOICE_PROMPT, {
            prompt: 'Should I search with a Filter or No Filter?',
            choices: ChoiceFactory.toChoices(['Filter', 'No Filter'])
        });
    }

    async filterStep(stepContext) {

      if (stepContext.result.value === 'No Filter'){

        return await stepContext.beginDialog(SEARCH_DIALOG);

      }else{
        return await stepContext.beginDialog(SEARCH_FILTER_DIALOG);
      }

    }

    async endDialogStep(stepContext) {

      stepContext.values.searchString = stepContext.result;

      await stepContext.context.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

      var reply2 = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Search Options', 'Search with LUIS']);
      await stepContext.context.sendActivity(reply2);

      return await stepContext.endDialog();

    }

}

module.exports.MainDialog = MainDialog;
