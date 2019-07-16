const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog, ChoiceFactory, ChoicePrompt } = require('botbuilder-dialogs');
const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');
const { ActivityTypes } = require('botbuilder');

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
const path = require('path');
const fs = require('fs');
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

         }else if(turnContext.activity.text === 'LUIS Search' || turnContext.activity.text === 'luis search' || turnContext.activity.text === 'luis:'){

           await this.luisDialog.onTurn(turnContext);

         }

         if (turnContext.activity.attachments && turnContext.activity.attachments.length > 0) {
              // The user sent an attachment and the bot should handle the incoming attachment.
              //await this.handleIncomingAttachment(turnContext);
              await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Looks like you sent an attachment','I dont understand this quite yet')] });

              await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

              var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Search Options', 'Search with LUIS']);
              await turnContext.sendActivity(reply);


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

    /**
         * Saves incoming attachments to disk by calling `this.downloadAttachmentAndWrite()` and
         * responds to the user with information about the saved attachment or an error.
         * @param {Object} turnContext
         */
        async handleIncomingAttachment(turnContext) {
            // Prepare Promises to download each attachment and then execute each Promise.
            const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite);
            const successfulSaves = await Promise.all(promises);

            // Replies back to the user with information about where the attachment is stored on the bot's server,
            // and what the name of the saved file is.
            async function replyForReceivedAttachments(localAttachmentData) {
                if (localAttachmentData) {
                    // Because the TurnContext was bound to this function, the bot can call
                    // `TurnContext.sendActivity` via `this.sendActivity`;
                    await this.sendActivity(`Attachment "${ localAttachmentData.fileName }" ` +
                        `has been received and saved to "${ localAttachmentData.localPath }".`);
                } else {
                    await this.sendActivity('Attachment was not successfully saved to disk.');
                }
            }

            // Prepare Promises to reply to the user with information about saved attachments.
            // The current TurnContext is bound so `replyForReceivedAttachments` can also send replies.
            const replyPromises = successfulSaves.map(replyForReceivedAttachments.bind(turnContext));
            await Promise.all(replyPromises);
        }

        /**
         * Downloads attachment to the disk.
         * @param {Object} attachment
         */
        async downloadAttachmentAndWrite(attachment) {
            // Retrieve the attachment via the attachment's contentUrl.
            const url = attachment.contentUrl;

            // Local file path for the bot to save the attachment.
            const localFileName = path.join('./bots/uploads', attachment.name);

            try {
                // arraybuffer is necessary for images
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
                if (response.headers['content-type'] === 'application/json') {
                    response.data = JSON.parse(response.data, (key, value) => {
                        return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
                    });
                }
                fs.writeFile(localFileName, response.data, (fsError) => {
                    if (fsError) {
                        throw fsError;
                    }
                });
            } catch (error) {
                console.error(error);
                return undefined;
            }
            // If no error was thrown while writing to disk, return the attachment's name
            // and localFilePath for the response back to the user.
            return {
                fileName: attachment.name,
                localPath: localFileName
            };
        }

        /**
         * Responds to user with either an attachment or a default message indicating
         * an unexpected input was received.
         * @param {Object} turnContext
         */
        async handleOutgoingAttachment(turnContext) {
            const reply = { type: ActivityTypes.Message };

            // Look at the user input, and figure out what type of attachment to send.
            // If the input matches one of the available choices, populate reply with
            // the available attachments.
            // If the choice does not match with a valid choice, inform the user of
            // possible options.
            const firstChar = turnContext.activity.text[0];
            if (firstChar === '1') {
                reply.text = 'This is an inline attachment.';
                reply.attachments = [this.getInlineAttachment()];
            } else if (firstChar === '2') {
                reply.attachments = [this.getInternetAttachment()];
                reply.text = 'This is an internet attachment.';
            } else if (firstChar === '3') {
                reply.attachments = [await this.getUploadedAttachment(turnContext)];
                reply.text = 'This is an uploaded attachment.';
            } else {
                // The user did not enter input that this bot was built to handle.
                reply.text = 'Your input was not recognized, please try again.';
            }
            await turnContext.sendActivity(reply);
        }


        /**
         * Returns an attachment that has been uploaded to the channel's blob storage.
         * @param {Object} turnContext
         */
        async getUploadedAttachment(turnContext) {
            const imageData = fs.readFileSync(path.join(__dirname, '../resources/architecture-resize.png'));
            const connector = turnContext.adapter.createConnectorClient(turnContext.activity.serviceUrl);
            const conversationId = turnContext.activity.conversation.id;
            const response = await connector.conversations.uploadAttachment(conversationId, {
                name: 'architecture-resize.png',
                originalBase64: imageData,
                type: 'image/png'
            });

            // Retrieve baseUri from ConnectorClient for... something.
            const baseUri = connector.baseUri;
            const attachmentUri = baseUri + (baseUri.endsWith('/') ? '' : '/') + `v3/attachments/${ encodeURI(response.id) }/views/original`;
            return {
                name: 'architecture-resize.png',
                contentType: 'image/png',
                contentUrl: attachmentUri
            };
        }

}

module.exports.MainDialog = MainDialog;
