// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { AttachmentLayoutTypes, CardFactory, MessageFactory } = require('botbuilder-core');

class DialogHelper {

     createMenu(title,actionTitle) {
       return CardFactory.adaptiveCard({
         "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
         "type": "AdaptiveCard",
         "version": "1.0",
         "body": [
           {
             "type": "TextBlock",
             "text": title,
             "weight": "bolder",
             "size": "medium"
           }],
         "actions": [
           {
             "type": "Action.Submit",
             "title": actionTitle,
             "data": 'luis: '+ title + ' ' + actionTitle
           }
         ]
       });
     }

     createGifCard() {

       return CardFactory.animationCard(
           '2%',
           [
               { url: 'http://i.imgur.com/ptJ6Ph6.gif' }
           ],
           [],
           {
               subtitle: 'Retirement Formula'
           }
       );
     }

     createReportCard(title, description, owner, designee, approver, division, classification, language, entities, keyPhrases, sentiment) {

     return CardFactory.adaptiveCard({
         "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
         "type": "AdaptiveCard",
         "version": "1.0",
         "body": [
           {
             "type": "TextBlock",
             "text": title,
             "weight": "bolder",
             "size": "medium"
           },
           {
             "type": "TextBlock",
             "text": description,
             "wrap": true
           },
           {
             "type": "TextBlock",
             "text": "Metadata",
             "weight": "bolder",
             "size": "medium",
             "separator": true
           },
           {
             "type": "FactSet",
             "facts": [
               {
                 "title": "Owner:",
                 "value": owner,
                 "wrap": true
               },
               {
                 "title": "Designee:",
                 "value": designee,
                 "wrap": true
               },
               {
                 "title": "Approver:",
                 "value": approver,
                 "wrap": true
               },
               {
                 "title": "Division:",
                 "value": division,
                 "wrap": true
               },
               {
                 "title": "Classification:",
                 "value": classification,
                 "wrap": true
               }
             ]
           },
           {
             "type": "TextBlock",
             "text": "Additional Information",
             "weight": "bolder",
             "size": "medium",
             "separator": true
           },
           {
             "type": "FactSet",
             "facts": [
               {
                 "title": "Report Language:",
                 "value": language,
                 "wrap": true
               },
               {
                 "title": "Entities:",
                 "value": entities,
                 "wrap": true
               },
               {
                 "title": "Key Phrases:",
                 "value": keyPhrases,
                 "wrap": true
               },
               {
                 "title": "Sentiment Score:",
                 "value": sentiment,
                 "wrap": true
               }
             ]
           }
         ],
         "actions": [
           {
             "type": "Action.OpenUrl",
             "title": "View Report",
             "url": "http://adaptivecards.io"
           }
         ]
       });
     }

     createBotCard(text1, text2) {

     return CardFactory.adaptiveCard({
         "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
         "type": "AdaptiveCard",
         "version": "1.0",
         "body": [
           {
             "type": "ColumnSet",
             "columns": [
               {
                 "type": "Column",
                 "width": "auto",
                 "items": [
                   {
                     "type": "Image",
                     "url": "https://gateway.ipfs.io/ipfs/QmXKfQgKVckfbGSMmzHAGAZ3zr1h8yJNrmEuBaJdNsGECs",
                     "size": "small",
                     "style": "person"
                   }
                 ]
               },
               {
                 "type": "Column",
                 "width": "stretch",
                 "items": [
                   {
                     "type": "TextBlock",
                     "text": text1,
                     "weight": "bolder",
                     "wrap": true
                   },
                   {
                     "type": "TextBlock",
                     "spacing": "none",
                     "text": text2,
                     "isSubtle": true,
                     "wrap": true
                   }
                 ]
               }
             ]
           }
         ]
       });
     }

     createComboListCard(choiceList) {

     return CardFactory.adaptiveCard({
       "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
       "type": "AdaptiveCard",
       "version": "1.0",
       "body": [
         {
           "type": "Input.ChoiceSet",
           "id": "report_name_selector_value",
           "style": "compact",
           "value": "0",
           "choices": choiceList
         }
       ],
       "actions": [
         {
           "type": "Action.Submit",
           "id": "submit",
           "title": "Submit",
           "data":{
                 "action": "report_name_selector"
           }
         }
       ]
     });
     }
}

module.exports.DialogHelper = DialogHelper;
