export const Keys = {
  IS_PUBLIC: 'IS_PUBLIC',
  ACCESS_TOKEN_STRATEGY: 'ACCESS_TOKEN_STRATEGY',
  API_KEY_STRATEGY: 'API_KEY_STRATEGY',
  LOCAL_STRATEGY: 'LOCAL_STRATEGY',
  MULTIPLE_GUARDS: 'MULTIPLE_GUARDS',
} as const;

export const Templates = {
  BASIC_CHAT_TEMPLATE: `You are an expert software engineer, give concise response.
   User: {query}
   AI:`,

  CONTEXT_AWARE_CHAT_TEMPLATE: `You are an expert software engineer, give concise response.
  
   Current conversation:
   {context}
   
   User: {query}
   AI:`,

  DOCUMENT_CONTEXT_CHAT_TEMPLATE: `Answer the question based only on the following context:
   {context}
   
   Question: {query}`,
} as const;

export const Messages = {
  BAD_REQUEST: 'Bad Request',
  SUCCESS: 'Success',
  EXTERNAL_SERVER_ERROR: 'Something went wrong, please try again later',
} as const;
