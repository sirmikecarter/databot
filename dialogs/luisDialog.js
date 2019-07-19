// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const { QnAMaker } = require('botbuilder-ai');
const { LuisHelper } = require('./luisHelper');
const { LuisRecognizer } = require('botbuilder-ai');
const { DialogHelper } = require('./dialogHelper');
const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');

// Name of the QnA Maker service in the .bot file.
const QNA_CONFIGURATION = 'q_sample-qna';
// CONSTS used in QnA Maker query. See [here](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-qna?view=azure-bot-service-4.0&tabs=cs) for additional info
const QNA_TOP_N = 1;
const QNA_CONFIDENCE_THRESHOLD = 0.5;
class LuisDialog {
    /**
     *

     */
    constructor() {

        this.qnaRecognizer = new QnAMaker({
            knowledgeBaseId: process.env.QnAKbId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAHostname
        });

        this.luisRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            azureRegion: process.env.LuisAPIHostName,
            // CAUTION: Authoring key is used in this example as it is appropriate for prototyping.
            // When implimenting for deployment/production, assign and use a subscription key instead of an authoring key.
            endpointKey: process.env.LuisAPIKey
        });

        this.logger = console
        this.dialogHelper = new DialogHelper();
    }

    /**
     *
     * @param {TurnContext} turn context object
     */
    async onTurn(turnContext) {
        // Call QnA Maker and get results.
        let bookingDetails = {};

        const dispatchResults = await this.luisRecognizer.recognize(turnContext);
        const dispatchTopIntent = LuisRecognizer.topIntent(dispatchResults);

        //console.log(dispatchTopIntent)

        // const qnaResult = await this.qnaRecognizer.generateAnswer(turnContext.activity.text, QNA_TOP_N, QNA_CONFIDENCE_THRESHOLD);
        // if (!qnaResult || qnaResult.length === 0 || !qnaResult[0].answer) {
        //     await turnContext.sendActivity(`No answer found in QnA Maker KB.`);
        //     return;
        // }
        // // respond with qna result
        // await turnContext.sendActivity(qnaResult[0].answer);

        if (process.env.LuisAppId && process.env.LuisAPIKey && process.env.LuisAPIHostName) {
            // Call LUIS and gather any potential booking details.
            // This will attempt to extract the origin, destination and travel date from the user's message
            // and will then pass those values into the booking dialog
            bookingDetails = await LuisHelper.executeLuisQuery(this.logger, turnContext);

            //this.logger.log('LUIS extracted these report details:', bookingDetails);

            await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Below is what I understand: ','')] });

            if(bookingDetails.intent !== undefined){
              await turnContext.sendActivity('Your Intent is to: ' + bookingDetails.intent)
            }
            if(bookingDetails.reportname !== undefined){
              await turnContext.sendActivity('Report Name: ' + bookingDetails.reportname)
            }
            if(bookingDetails.description !== undefined){
              await turnContext.sendActivity('Description: ' + bookingDetails.description)
            }
            if(bookingDetails.owner !== undefined){
              await turnContext.sendActivity('Owner: ' + bookingDetails.owner)
            }
            if(bookingDetails.designee !== undefined){
              await turnContext.sendActivity('Designee: ' + bookingDetails.designee)
            }
            if(bookingDetails.approver !== undefined){
              await turnContext.sendActivity('Approver: ' + bookingDetails.approver)
            }
            if(bookingDetails.division !== undefined){
              await turnContext.sendActivity('Division: ' + bookingDetails.division)
            }
            if(bookingDetails.classification !== undefined){
              await turnContext.sendActivity('Classification: ' + bookingDetails.classification)
            }

            await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

            var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Analyze Documents', 'Search Options', 'Search with LUIS']);
            await turnContext.sendActivity(reply);

      }
    }
};

module.exports.LuisDialog = LuisDialog;
