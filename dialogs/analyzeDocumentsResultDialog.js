// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const { QnAMaker } = require('botbuilder-ai');
const { LuisHelper } = require('./luisHelper');
const { LuisRecognizer } = require('botbuilder-ai');
const { DialogHelper } = require('./dialogHelper');
const { ConfirmPrompt, TextPrompt, WaterfallDialog, ChoiceFactory, ChoicePrompt, DialogSet } = require('botbuilder-dialogs');
const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');
const axios = require('axios');

// Name of the QnA Maker service in the .bot file.
const QNA_CONFIGURATION = 'q_sample-qna';
// CONSTS used in QnA Maker query. See [here](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-qna?view=azure-bot-service-4.0&tabs=cs) for additional info
const QNA_TOP_N = 1;
const QNA_CONFIDENCE_THRESHOLD = 0.5;


class AnalyzeDocumentsResultDialog {
    /**
     *

     */
    constructor() {

        this.dialogHelper = new DialogHelper();

        this.state = {
          itemCount: '',
          reportname: '',
          reportLanguage: '',
          reportArrayKeyPhrases: [],
          reportArrayOrganizations: [],
          reportArrayPersons: [],
          reportArrayLocations: [],
          reportArrayEntities: [],
          reportArrayGlossary: [],

        };
    }

    /**
     *
     * @param {TurnContext} turn context object
     */
    async onTurn(turnContext) {
        // Call QnA Maker and get results.
        //console.log(turnContext.activity.value.report_name_selector_value)

        var reportnamequery = "'" + turnContext.activity.value.document_name_selector_value + "'"

        this.state.reportname = turnContext.activity.value.document_name_selector_value

        console.log(reportnamequery)

        var self = this;

        await axios.get(process.env.SearchService +'/indexes/'+ process.env.SearchServiceDocIndex + '/docs?',
                { params: {
                  'api-version': '2019-05-06',
                  'search': '*',
                  '$filter': 'metadata_storage_name eq ' + reportnamequery
                  },
                headers: {
                  'api-key': process.env.SearchServiceKey,
                  'ContentType': 'application/json'
          }

        }).then(response => {

          if (response){

            self.state.reportLanguage = ''
            //self.state.reportArrayKeyPhrases = []
            self.state.reportArrayOrganizations = []
            self.state.reportArrayPersons = []
            self.state.reportArrayLocations = []
            self.state.reportArrayEntities = []
            self.state.reportArrayGlossary = []

            self.state.reportLanguage = response.data.value[0].languageCode
            //self.state.reportArrayKeyPhrases = response.data.value[0].keyPhrases
            self.state.reportArrayOrganizations = response.data.value[0].organizations
            self.state.reportArrayPersons = response.data.value[0].persons
            self.state.reportArrayLocations = response.data.value[0].locations
            self.state.reportArrayEntities = response.data.value[0].entities
            self.state.reportArrayGlossary = response.data.value[0].glossary

            /////

            self.state.reportArrayKeyPhrases = []

            var itemCount = response.data.value[0].keyPhrases.length

            if (itemCount > 0){
              var itemArray = []
              itemArray = self.state.reportArrayKeyPhrases.slice();

              for (var i = 0; i < itemCount; i++)
              {
                    const itemResult = response.data.value[0].keyPhrases[i]

                    if (itemArray.indexOf(itemResult) === -1)
                    {
                      itemArray.push(itemResult)
                    }
              }

              self.state.reportArrayKeyPhrases = itemArray
            }else {
              self.state.reportArrayKeyPhrases = ['[No Results]']
            }

            /////

         }

        }).catch((error)=>{
               console.log(error);
        });

        await turnContext.sendActivity({ attachments: [this.dialogHelper.createDocumentCard(self.state.reportname, self.state.reportLanguage, self.state.reportArrayKeyPhrases[0], self.state.reportArrayKeyPhrases[1], self.state.reportArrayOrganizations, self.state.reportArrayPersons, self.state.reportArrayLocations, self.state.reportArrayGlossary[0], self.state.reportArrayGlossary[1])] });

        await turnContext.sendActivity({ attachments: [this.dialogHelper.createBotCard('...Is there anything else I can help you with?','')] });

        var reply = MessageFactory.suggestedActions(['How Do I Calculate the 2% Retirement Formula','Select a Report by Report Name', 'Analyze Documents', 'Search Options', 'Search with LUIS']);
        await turnContext.sendActivity(reply);



    }
};

module.exports.AnalyzeDocumentsResultDialog = AnalyzeDocumentsResultDialog;
