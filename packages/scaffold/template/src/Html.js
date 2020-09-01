import React from 'react';

export const Html = ({ assets, context, body }) => {
  const css = assets.filter((value) => value.match(/\.css$/));
  const js = assets.filter((value) => value.match(/\.js$/));
  const {
    title,
    link,
    meta,
    script,
    style,
    htmlAttributes,
    bodyAttributes,
  } = context.helmet;
  return (
    <html lang="en" {...htmlAttributes.toComponent()}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        {title.toComponent()}
        {meta.toComponent()}

        {js.map((file, index) => (
          <script key={`js-${index}`} src={file} async></script>
        ))}
        {script.toComponent()}
        {css.map((file, index) => (
          <link key={`css-${index}`} href={file} rel="stylesheet" />
        ))}
        {link.toComponent()}
        {style.toComponent()}
      </head>
      <body {...bodyAttributes.toComponent()}>
        <div id="root" dangerouslySetInnerHTML={{ __html: body }} />
      </body>
    </html>
  );
};
export default Html;
