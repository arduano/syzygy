declare module "react" {
  // @ts-types="@types/react"
  import React from "npm:react@19";
  export = React;
}

declare module "async-lock" {
  // @ts-types="@types/async-lock"
  import AsyncLock from "npm:async-lock@1.4.1";
  export = AsyncLock;
}
