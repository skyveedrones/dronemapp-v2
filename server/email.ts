import { Resend } from 'resend';

// Initialize Resend client with lazy loading
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Enterprise-friendly light theme colors (better for corporate email filters)
const BRAND_COLORS = {
  primary: '#10b981', // Emerald green
  background: '#ffffff', // Light background for enterprise compatibility
  cardBg: '#f9fafb',
  text: '#1f2937', // Dark text for readability
  textMuted: '#6b7280',
  border: '#e5e7eb',
};

/**
 * Generate enterprise-friendly email HTML template
 * Uses light theme for better compatibility with corporate email filters
 */
function generateEmailTemplate(content: {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
  <title>${content.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Use system fonts instead of external imports for better enterprise compatibility */
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_COLORS.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: ${BRAND_COLORS.text};
      line-height: 1.5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_COLORS.background};
    }
    
    .card {
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid ${BRAND_COLORS.border};
      border-radius: 6px;
      overflow: hidden;
      margin: 20px;
    }
    
    .header {
      background-color: ${BRAND_COLORS.background};
      padding: 24px 20px;
      border-bottom: 3px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .header img {
      max-width: 200px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    .header h1 {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: ${BRAND_COLORS.primary};
      letter-spacing: 0.5px;
    }
    
    .content {
      padding: 24px 20px;
    }
    
    .preheader {
      display: none;
      max-height: 0;
      max-width: 0;
      overflow: hidden;
      font-size: 1px;
      opacity: 0;
    }
    
    .body-text {
      font-size: 15px;
      line-height: 1.6;
      color: ${BRAND_COLORS.text};
      margin: 0 0 16px 0;
    }
    
    .body-text p {
      margin: 0 0 12px 0;
    }
    
    .body-text strong {
      color: ${BRAND_COLORS.primary};
      font-weight: 600;
    }
    
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLORS.primary};
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 6px;
      border: 2px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .cta-container {
      text-align: center;
      margin: 24px 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${BRAND_COLORS.border};
      margin: 24px 0;
    }
    
    .footer {
      font-size: 13px;
      color: ${BRAND_COLORS.textMuted};
      text-align: center;
      margin-top: 20px;
    }
    
    .footer a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="preheader">${content.preheader}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="data:image/png;base64,UklGRk4tAABXRUJQVlA4WAoAAAAgAAAA/wcA2AEASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggYCsAABCRAZ0BKgAI2QE+kUiiTCWkJyIiFPj44BIJaW78LQ/pnHQonk7/ZHbba59fy7/I3i7mrzr+r/wnO9/tu6l/73oY8zb0f70n/ZvVV6ZbIc/Kn+m/vvdn/tf796R8XnkYej/43mh/IfuL/T/wv7kfHf+273eAL7l3W0AP6f3lWpZkAfzLzy71r8b6gX9H9Gb/L8eP2B7Bvl1+yH98PZU/dYQ19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYYXW6vH/8QAt6KiRSfFM7pZnzo9hmdOYx9iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYhIRfGa0eOyNHiBooawvDOrzF7GlXHWMfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdfYh3X2Id19iHdagCO3EhjAKt3886WTOvC3oBuvYWdRchSkSrMMSD7r7EO6+xDuvsQ7r61gR//7+nvCwz65x6ki2Ij5Z0FPuSTZiSmlXHWLa1r9IlRS8QF42Q2zEml1y1fysfYh3XwRThCNOUq5Hmmm9u4uN5fEYn8bEMlNKuOr9V3x2G+EbwjeEbwjeEbwjeEQNJh1TqGQvNfAkLXV+LWdidOsAtVHbv6YqfSid9QbyEcWVoKY5FhfTE9MX5qyjx2LC8bIcFMibMpZlLMpZlLMpZgEvm97+IkGKftqKyOvrYJRDWBwJS7r7EO69+97Nguzh9PBDSvMBKQGPsQ7r4LB/xvZpakVbjTfSC1sGZuPiJKaGvxzBSuJpVx1jH3s6RVX72TKk8+ibyU6OhQpGn+r3q38zBJPnwGV878GrAWPtXHWMfYh3X2GVDVUGVw5nXxAgJAd2WdmBe292CAjyJCCc3/tjF6RJNxLbolDBHkSUvZUhRG5z7EKXmkYPL4P8riaVXajGNKuOsY+xDutLBIzV2Dzswzq8/mxidZOK4bEuTmqEWXlSsfYh3X2Id19hiRp/zfYhSebeVw3TOd16NvK4mlDQENP6sEBHcPHuvsQ7jeo2zLa1yJKW5GiuuxOnVj7EKSAhXHWMfYh3X2GUNZnENlEkDV0NMZNqIC/eEGgLHxjLlwiU1KFo8iSmlXHWMfYhPqP832IUnmwEPTYod5mSm6Ibr4kDP7r7EJkI+HopODn7nj/Iri8aPIkppRAHziSE+CKB+s8sn5ZiEr1Nt7cwR5EhhGdGsEUOx0RgUyJsylmUsylE6yBjtfnrPTMLhSyZlgNCL2/u8pZ2zQ1ACfTQY+EpOS+pOZSSZoEgMEqBjxiwG2/CN4RvCN2Ty8kfHNU6vGBTImzKWZSk9/Ha9vK2xReVsbzK6EuKVsx6yfprSJKaE9Py1n7jiF8R3YK9lvDFNKuOm1bANMa69c4k63O/wT6xiaDz9EBqkdz+Q7r4emzD1Oj7EO69+S+wvI1bywsQ9EUEdzRCkXgj3xTCF2GyShr5APJP71VtyJKaH2xQmjyJKaVcdYE0dp/HcFolJiPkBaEajTs919iEr4nYB+w5sNswLJsqlXPhXHWMagJBTTmLdDbMCmwemPsTD4felvCZ265pVxuCM6NlmJKaVcd9wNgXZWDvkcYtCV/ZeckdJouyz+49F8pE1xNKrudaJ4919iHdfYaMYvHOTiZPAv30Q2sDdIdsQ7jZghsI/5kpxWMWHP8MTslsQ7r38i6UyRspuTC0wenJ4ZDxuNbm9WLqWwtoBHkPTw82HWkSU0q43Ci8/poLmmU4uBl4lCuNJuAy/kO62XEh9aRJTSrjrFz4Va3UAZRKLXizGcSW1qevf9yJJurGdc2lVTgIeduHTzYdaRJTQtLI88Se28nByzkY/nMo6ieVgcnnxRy9b3X2GiVujZZiSmlXHTpmmMPjpxcsOABkKJrqZWgGT/yUvPhvdfYh3J8Ku5AgI8iSmlV3IDCf6OCBei65a7GqJUcRDdHwbRAEMXrzDdouO1tYfqGjGNKuNkWo2nKf4xG2WUi0xcFgbLHfX7baNAziDgdTSq7UYxeNHkSU0qt0n3Gb2lH0POBpIaiIU7QmonVtEiA6dJfyHdfW8MTslsQ7r7EO62WYdGkndU4IWdXeKMnWn0cg7MSTdUG7Nm1uU8GFo7SkMTslsQ7kNTXp+EWR1G5NinaFklLez4/Y18NJoWoD2F5OJpRplAOaTjQOc9kOCmRNmUswz4VsWgOBdDNkHgiyvsXFx5FB7sHgZCb46JINfDYhriaVXcgMhCuOsY+xDuT4VceOcpHNDiwoWIJjlH1EE17pAuguj6hJAcVaWdfuDrEBkIVx1ftDPSUGpu96YB5HT4myvFvZcvyLfegWkb4yuHYTwrjrGPsQ7r7DHiQJEPu0JEXvLdyRBxhstvyxB3YICPHWIDIQrjrGPsQ7k+FWWafKUFsaMEoH3sNc4D5+iOgrDGlSgV8N4MUXn9RDuNcDOX7zUbwGsS9iHcb1iM+J6YbUlvx6dbW91smUA+6+xDuvsQ6DApFqGtZBkmxYEd6Zs50WjmFcnPIkppVdyAyEK46xj7EO5PhVs2KbAkCrfMhIcWdVrmpz6UQOy9m1GhhEktNL49hnmw60iQ3c9qpI3wnCMDHH3RTIHzvDzmUO2lrJfjtKfZWwB+kHq6rmuHzF9HYuBVTj3hgDFNKuOsY+xCa/5V+tUfuesnkJkA1o6bnYNHYoeAmfny28riaVcFDE7JbEO6+xDutlmHVmwrRxEkdMIFOSOFAWOAIzMmD16fgWvmpYcFq2xRef1EOfojm82Yn8h3X2Id19hhgPS8gwZ5h6eHmwDPkCrbYsLxshwUx7fm65MeaRfvZXo+47Vx00wOQtCM8SjZw3Twaxj7EO5PhV3IEBHkSU0qu5AXdlUkW61xSy0IylqbT1SdnFYuzsgHNkbS0LAnn9Q0YxoWhxD0AmR5ElNKuOsY+wxMllax2HCkgIVdyBAR5ElThXHWMaA3Q0Y6eH4fmIuT19iHdfD9Q0YxpVx1jH2GjGLxo8h1lilxO5/s7V2PrL1l4DesC9dubpjg5gY+oaMY0J6jWDAnhgXhS/CN4RvCN4RvCN4Rutm/Byk4+IkX8Kw4HqGjGNKuOsY+xDuvrSYWHDJ5o8eTYiNB919iHcnwq7kCAjyJKaVXcgMhCuNr5MvEyeLkw8HqBX2eDZXkGmohSebDrRyQmzdsqeSDJJj00L+7g0CtzymTEOyqyXQ0J3Mas5kLxGFcFDFNKuOsY+xDuvrQtQ2wsB+0BeTonE/kO6+t4Ym2NqHiGlXHWMfYaMYvGjyJBiu5VER4iQYR/LeLJ9iFJ5sOtHFozWgNa+tO4wCzEkBHkSU0osvOkPDSxttgha6fp17CeFXcgQEeRJTSrjrGPfB0i25QCLh7U7BHkSU0qu5AZCFcdYx9iHcnwqx2v5fZVx02Egs+CdFspzC9ojlte1cFDE7JYEGRqC07RAJAOSADgQEeRJTShk5sbBV2GHFmJ6fB4ebDrSJKaVcdYx9iHcYu6lhhTfT8hO4h3X2IdyfCrU952SkBHkSU0qt3m42vLsthqHsbxpVv+4Hvv0+INIyEJ2ndECpP9IREk4oH58bwEOUlFHyLuZK4B8h1t6tZoT9Yx9iHdfYZrcELyeFfGqzYziJt96hbuTAHO0/JkB4PiaVcdYx9iHdfWmIoZSufJXVaazUFEO6+xDuQvIzNY45BwMeOrGPsQ7r62DJ4GpkTVQuFVB918HTCHtiJum9fDsQVUHhU0q4Dc4nBTIIQ82Zt7oE9rJ7WT2sn3dn5WaSrjrGPsQ7kJog68bIS/bBruYcH01MiaqFXPJt5XE0q46xj7EJELJLbqxZ/5DuvsQ7rVG5hKJsxp035d5XE0q46yDdiHdfYh4xV+pXE0q46xj8WP0qZj7EO6+xDu5WId19iIRT+Q7r7EO6+xDutHe5NK4mlXHWMysQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDuvsQ7r7EO6+xDngA/v9V0AAAAAAAAAAAALWSjGSRjwnbayfSNXWm5ivjOfFi65H8++mRX1ZmlxizdvfsmvKppNreBU1WFfIBgvvjCr1u4ABMoA3edSAsCNorkRDzyvsgJ0/fR0CHRkCWUmSLsMoiydC9GIX4zl4BMY6uCQ/xbim0MUmtjVlEWbiVlRxREF4HiaqROpxT6dHQXaHoZ1CARfOlq4r2kZkdaU8tZB/krZEPAUYmVxQ44mvS+dwv4kQU4xammkzK1HnFv2+hO3a8uox5XhQM0Twj/6D4UXZbJQEjVAAAAyB1S05RjSxAfPCVIoaA/v09Wf/h9etfFtwEefoE6wVN/Ly7wBqwn017rSbi0r8sHuE5sYeKniqklGVCgxA16DMQrTazPZLb/BaOXDhZIzkrTqyNhL+UpDQnUuYZOtB01hrcAAAGsbDSKAj4EpWmxeOXgKO2l9FqKa18bP764VPJsNiBs11pNxPf89/JL6MuR9wYHRa2DrzF3p5T9jiFr4RBU2LsS+D0R7KlmOXWUfVVX9FFbL/b3eehJ6o7ZZ1MSfGxNP0sHM7gbiajI136X6t0F8qZ9qe2LgvX1hZ1NwoIeNCxHxiP2WL1Oy9AI38JnXqYOPhwmKEEx1pwRhthHkjIUiVGae+qeRh/JN3RF7HA7HXdP/I2mDOJoL8IFolOrEcTz+GOzH+fc6uTGQdh21lvj66xaS35RCiUEO/lVoPNixjLCaLVIXpHPeXck3ld6dbPiXX26/odJCKsaxddth6IGIJroxF8ahJFDUYfBdGwZmOpEPIDM3sGSdtmlCbxzrc7wQKm5uNXuLEWgGUnnnULAgYSkkvvaTrzRj1WSUPBf9ZQu+kG6LU31AjtmS79ALJf2rfgjxjuF07l1pipIwo/2hZaIEeyQQnCNLgEkaKKtMoOhUomn+czQfHojdSyqgLIejg8UY5aI6RFfLEW/hf3vsWDEEXKHW3RdJMqCC3iGicM4igHTQjfpd44WeiPuhbgq+O0HUXqm+oLkR9L27Et5YPqZ2Fpg59DJoLI3DG3VmGrWMHXce4sIYNQ8jC7xN05FXybJ7R+QJgKhOCOJBnS0SHqFVKxCNekjD3xPbli2TRshU/qcI9NaPJiOODIc9wqMD3e9hGzk7t7WgRSHh6D4VG6jw+0cexAUANiQncxH2Yrsx675kujdTa5/9I87tOpqLA9K1YaGn4pQg1M6EU9bsK4sI5OrTAPgeO7QWmzHqM0c+GNq3sFShC49Grc+UtC7oA9qyWOti4kQPSOk3JnQGeG+olOS7O9garOrRhZeEvhbUN0ZnilDPRePsVGG1g5nTAyXMABPN6Mnq7Tk4YqlaOPtoUlNEjDyvOZGjX3BsmqFYRBRPQm35o4/VG5r5FBN1fJHokXNa+o/DdA4hpk2RLgaSBmzoo4nQMffQ/4oLGRbeAkE88HceAmpUapMMyjRvbKK7vEepoHbwps1999+0AkXJ5W8P34aZNRVW77Hpxs+pg7g9qG3PYlTxbZJ0ZOszqJYZ5IiG83eqvv6gJkVxw48LDClyuHGnSo0SzhhovER2gFZhsSHRydmf3lVHNmRsR7i1qmjDUpGnc65teJ9+H6A26XAmyiuIpG6mEFwVhkoX7EXr8TzE8kQfBvyRN0pUMCeVw9Sp1vRvfleIK5hWVGaDgTSqxjCxhSXm9P3d/JIMosbBZg+jC0gopLxIYw1rpMgnpXKTuf87fag15HEsgfpK+sbmaeDa5ppRjbeVVCphM1USZhqje3H58BvteK/2R0NK6ror9uf0aiwIDCLLDFeUtDhAcbkKO7jercZC9vcWxyZhX1N7IRwVCWNCAx6vPA+VA+dGXrVtNwY1hd/G0ZvCz+Dyg5/HQB4rg/myF+yildHGP4o0CpAt+Do3fRfMI7Svw+avLTISfqRJtJwixGPeZhi3HoaT2+JdED3UUGKqMPYshW8bl9RHMxSLgx7boFRmz+9UbGkNW0nz4HCsl8z3ubln8h56GulNrVsrCmJ9+qO84wpQWbD14D5LScRQXVYWrT3OfPmL796UTKiFwG7SC8yTJItjxuIaF3uzBAUTDvp87ptis+ykoi8CzkpU2AQLAB8Xy7cJ1jMj/FwXRudbEJPYjGT0mHU8GKzV+p1IuHI+tVI6TKQWLbQ6iJxxZGcc+taHEwm/VzNm4AwB4g0KCqQm1ZbrMTOCkEMriFWdTBzQScXc/UjBjzROj9kEzLN0b4MwHiek0FUVulCpZlTWpb8+gVy6MXrze7jq+2oKtsgyAd87V3KbID3ojWB9+kd8zAwcfqFiCyB6ek3QIRAqJGLXf2pbwEeMoA02KTkVOPz2dIx8SFWiTFAFZPLT4QxDeuHPIAOaSMk3WJ4xqjq+6dpEQU+huuXc8SV1z9jjNNJp5iENzL3Fu7mXEu2wqJpkoBqK3p7nsoyGsouea2y+PVUcVrxSIRA9Bpb204OwzZHD+qbQSRlrL6oKXg4uwn2vt7PYf9L30aLgbIGNnALwA7KQv52e+ukn80RoJ6JDUP5j7wsZn8xH/teE8lBW29takM4ghDxBtBx4BrXDwO0B1yu5jMfSHbaq5P4FmODEvBlbYEXzv++LoiuRnePtX9bgyYv0r036rCi8Nd5uuHOTZqlMhSDmvqWoBJgqy/KUZPBWKgDujt/7i4pzdjTHL/gRHV+pA1AMS/j+RRz+3IAM7UZjJxoz8sEK9JtS7bWSb5UJ6YbPnFbxMBQ1rd7T3IIhvlx5RCsDNBGxc6GgXiy00L5fGURGIh5CqESGAxrARy4LxWnhT/5o3PigDUybRyxY1P5l7TNEQxwHjhWaM0rieW2EEQ/Yof9ok1nlX9sKYC5gX4Rdfn9Ai04Qui4h3dYEP7V6dv4Lkf2OF0jUc0q2oS0tE9ugcFWtIioVbU7gmJMrHgJaJPtoF7LdQE/x1z8zKpYlHBT/GWi9YF7ETzszu4goLYbCH4GCy2f0Ya5NI85uuy6yO9V37WuXpQvUe2pChQHzlLC0J7AQFkne9v/6MGNHY+dBUAduLQLA7HmK3bB49J8Oo5mvqA33MqA/AJh5Pqp4Ted7GcApzJWmyasdupgMydT7wH7donZG90r/fkgjpntHhlDPJcQWb3osISIRAsUZbUoRfGEYjUyQMR1CcJq+41fiIg6wdbs+uuo6BDrShq9M9wj0kGu0nyItXRO3DNJtw5wFbgSGdm8BkMN20FAK7M3GHhKaq7yuPQGU3QN+3apy0wvLwFHSnPIYAbKQYfULbA2JksRnIlCCKdRtJeJxm5vERcofXhiHROg9CYHoSEwjZH832w6L6QHlUni7hvcb42G3fiMZ77AUr+3Oxu9+5gAInGDqHD1Lef//kydsP29uHJwrrd/WErXp0gTGZCpH9SN2yY//m/XPnK3adc7eSL+v+BzOKDQ5FeckdAb+OVjqaL4chE/Ey2Ur3b6dx2PY3KxWSodYZaeZkNlGZrTihqtZj79IbxF2y8bT7iTEN5YmukrXmL9RX+gT6zm40eH7UF5cerVdO7rrCVAuyEVDzySBDlvH5YL8X7LjkDuEekXqhmW2XvTxi+nXW+FEl8X2ChDBjDYljcsi8sFrTGueEv7U6LmV4pifPUPTWquPQ3u+bRX3JUAc5ff/9H2LG/DoyjBhPWyGAkvfUo8ZxwnR1ZVtTZhM+lcr40Fu0JLXBT6jHzfOQE0DL6epaKPtRaGrD2/EfkiTD+Rvy0wVu0+D2JneEQAJxERhbSHJKDyfv4HGObmx3VD9GO2Ajn67hkkA37G8HNBFdg/CU0FnahFsG7Wo8J0kX1UH61GFZGsxXa0r0zNWE7K7ogg3GySSNZADa3qf1ejaBva6hpVZMRVavL6QZUZ/Bxh3aS29iFPTwz6VIAf8TgOMjWcxL2iALF8mewdfjIW/rsDHVjluK7PbE7fsDl23pLfNIZLyXsOZKwyFUwqlTqprnQJm7svvlAL1tx6N3TeMWGMhV7BIPK0bjXz3Mb7GU0QtNzP0FpVUE0Z+cksU3e/zIINQ5UEs/A1SO7H+brdPZaGaH6mZjhkeMXres0rMk+KRVfl17+ndTRqQV4BxWJ1YpYiECuALcdkiOdBXMDpffz77SUqp4tln8bL/lm5+A2l71LU0uunZHAFtP9i0t0TLMryb978QqesWTzVy5wY3v5e4e+sUr4HHVHWslZP5DP3cdeczeH3usteCW4BGjJvS8Td+ootaBwlc/LGsdg0QOoLB/V4MNbLTlplfK9c5aMKgW9mbQyxSHAcIKX55xr25EoD0NrcNSjWR1X6Zk4plHrkTGdPg/vhjBllTJZEsZ/N6A5a/Kg5EQaBdY2dBpXKBzJ6Grk7jCqECjlk6IVmpsOGNuDr2y6OtftdbCTdIvQ40dBcDti4NEgNrSVfEYuTh/n3YWsw/ejGphoTG6C4Q5/vRaiCEOIiIcDGWRFGzmDpcEn2kZJ63q8xNymocAEXaeWOX7SuiABngff+f+0hmuz0sgLomHXvoEUb8WNaRX1lftVv0ESkEnprSVAwUz3RNBLb0cZAP8compceoYC/d6OZC4AG73UrTHHFgWAP3OBMn34OP+KxYMIvGZDsHdZq7qhpJSPhBPVKouaMIUeScQ6M7Nmbr6hgGf4YOlJ2klyjozE2iZ86vXAgj/3VmZarp6NDTZ0bOU5Ye00Ks1EeUunjMzfLAa9ZHZ0ffdbeRvufjcy+uRENtSvqqiqJqivp/QJyubRJRBw/VfLLu+nPNSJHd/VJxfQ0E8iy1W75C3/y5g5msvxlktLElV9VnCIiIrPP0hwCWsqFcAzqOjzPaD5KZpjWN40opxacQW28i5xMLTnBTEpEdatt7Q+P4GcQAoZb5oq+eVAU1TYNP+5B588ZzIYbkAKaToHP5BlILrKdi85rIBTxNYrzRG/wUD2mmi63NK8S/2nUSaqv5Wo5cz2/jRZvQuUMXmsw7eia9Yl6AbZIeynL8NSqzcX496upwF7ycHzjehcxI76TTnWDqYRp4YKtTmrhHlMyWTfKJUHRJnr3uexDzQZVw2dbH4gFYU8Alw6LiaFCxzjAM/IsrrbaZbxnxLPeYjg+GksLvyyTZ+toKQdHgcUZstIKtEXonEjUehohH8J5iPV8+h7ChBej6Juiv9Csu62rezYAjEO0JVQjT/eVfELqes2futMG+62gqScwdpGdc4kbjgAgJGk8YQKKMheMrZ8CwR18GbGfczV9ShJvZwmjTpj5LOy4iF0PNtYTlIbkCVXeJRQ3gXA0kaZtiyD8OZh2ofeb9v4P/8Ux/2RzPvsxH70wY7HnkAOtFfRmiRw+c2Gs1xGjXGHqVOKzbo9zIVps4ABzk3XVnGFlFqd6p4mGBZvFMCbq48KfmwDAVM9AX0LTXlZdhHd96NDPDBVUIRXCXev4Qk4pQPP/3LpMFn+Joo3mOpPxSbQfYl+VHPw7gU+YzoltC2VKTvh4GXAyNueOZawEAfyFI6qsj31WZdsP8BQq5Hev2LDTli1/CaJNIOgOk/bXC06sYa/F8Q3hvcAFSdI2A3d68rlCFi2WQTH3G3uEclOxJzew6lizvBUUOFAHwc6YaS+NN/NnV9oB+/Bwor77Lni4DRNx4CWiykxw4bNaYI0HI4YunYKvS3HMRb2sUGMXCI9U2RG97UYzJqIxXciHrQHL3VWXobuxNIJIpsT2KyhO/A/y2QSkxxfyvGTWv4PJjGI3yVVmegZ7H6eKycMvVdSHOhQAXR9UwuVC/pb96zd2stgHAG++kfRYZ3DvzrjzZqVwtrdStav/L5c6vbP93Z+Wd7neDGCNhqZUOf2RoD45UZLr4jd8GbGT+7brr35x1WQv1ZRzvq7br2MTe4We7XI4H5OmOhpsM3AAiDHDvidXdGrYHuqJmG7zT7XkEZXLNg/gw13kW1ObTWPuscbO9JWZKriCLFjqNQ82+JoIX0t/kYhP7UdaRFRvX00TRBKPYps4v6+xVCBosQiVytppp92mAjHwzZTJalXlezYYF2iUcb3ZVnqZCaBBnNQ1PzXrBwKJaZbV26/IbVOR8afhVx0//TvqwWCeMMa6dGXGfQiKAy9dt7GijOw6Z/xxAezRLsYLPF2PkCYPGnDjAcpRg3vZYNzgb1EvvvSdp0Lw6K7NtHHsTml35xpy3pfz+Lozd08QLuQ/CxtZZgwkzh/YOP2IQme5ckCp8daJezF6z7O7STpDYjbn5sUlBl6W5ZXfN2sbq+vRRj0bOAsS7Jcyr1B+VAX3Kb91jb/2SUiS+p9xmHVv0NRH8DCO3Nlb7opL9Fjiil3hS5Gc+WNEH7QHCiWum4MkjfvuRr3zgMxVRvh3TejFCH7WYOmq+ysj3qjnG7zeQgBU+iitOLh4fgAiyas16SXRKtyB94Rfqn+iIbI+r5MkqJR/SOoRT46NCprX1GBrGXZ6Iia/KoeNRbc1o0mHxRXpWw8QyutzklnHoJhy44KZBM4UkSR/gfjRRRP57eMAASY451VrD8M1QNgK8lZTWgyaDYfv4SGOGNmcSMLFFD3b9LYXRDf/UnX8MQg9nOzGRStckGXFCeJyOAifT2DG46t9Nv9tGr6EyFTsku8kd56rB7POD63s1c9U05LvcIY8RxHjE5FrfmElsvcM9mVjp63AvK59oAjp3hWSORzqqjr46SMicKzbG7dcst8g/UJKQd+bBpzRQaLs8+SMHD9RdCncPr9SCpcyIWqBnw/hRfAZOq11rKYSD4U9ZqqjCaS+jGD/GdPVjxOFF+8VrKqf7QDSu/feg0h8pxyzwbD2tfF1+9Bgpo8LYw3Ku0uWZ4dXoIucVLchhbRCQcQ1GuNmAR1xXBQNbqcy+YX9wxw/bnPRUsNwWKFyOSHgZQvgrzbpcspcJPINfbvqsK0+/UbY2nq+zqLn6kWk2AaLB4vcm4c5VZeKWwpoB3MdL++cPp5hFQSnOot8moMg2gOZx0qgkiU/OVQwREhvkxfzsxCK/ndoclOXAVjcMe3TflzA0g1ajMcUAzbMUoCkZK+LLI1XnuGbvkrBXpWWEqM+3F/vrw3YfbCEV8W7ILlR5XyBsQjUUeoo6sYJsvF9SGdK3GuPjFujDuJ6bar3iZbfu7xTX+Opcg8zLyx+WV2MgdD9Uz13Cy0pdpZzePBmJbHCN5YpC+3I2lk89tgPWH57NHWAb4y+i8hwgyox5/wAKL1+mjgCmceTk0lKn1tb0PQo38xCONV5gwZLYTYfDm0TOipG61F+iorf7/7V0t8WzETIYZHHTRFeCMJxPT+EVdDn4Had/iDF/fZC/T8I0PKT12BiobdiBogr4oFU1IBediAn46oMWuzonpN2kvzpPcDZ9wn7jJZouWWluEN1Yx93wD+pn3wK614ShGmggXcjeNlCR6IOvjpQpr1oPuWge4yTM3wVTcbAzY9bAfnpEpb7FEqkmTUqZsIW+C8pTPD0yQHIZ72uibEUYiAi9GuPR8OcW+ha422tOjHSj2GiWqaUIoPdd6Z+9XxE9CmMj6x06NaGbOLqe3Hw2iErXZ0gRwrrJupxqSbDvXQQ8kyyGCo++uTLIQSCfcZ1wVU6LlnRPHFu6Js8IrwBa516mcl6EaT+xGR1wsCRy5bCAKDZWl90BzCWbl/uAOKeQNFZyyujSFOlqL5lmMb/VK95zPfWc1guuBg6iABf8XLYVkLAx5JTgzpCV6Vwk8ynm0t6lVKxEVXSQY5IdsMzA2QSYjwuDCV/Z5aAx1Mpf8ClSPN1unA4CnqXBvDngD0OSFVCDwl81aDLo7FUkOAazF2gBpPYCezNRaI18Pvy5WpJ701atJrN9CLOOuF+sIicZCC8IBQXk2kLFH62OBDcvvJX69HDRej2MPjcxv4b4KM+I7+8T/NqrxW5FUtuCxcwwCr7cWcXZGU1799OKceqEf5njINOk2wmFoHA44+gd3fYroZCj0bv2Jk4QjqKeZ9vVhUkcZe3/z0XRhZfWLKeYvmwiXPOpGytzqoNTJPMEWiF6JdCDo4ao9WDputCoq3wfb/2AvLuicWKHL8YHWIN2/lWOZ7dgeTSy41OcOmCk1PqQCw+zhM9cyUq/3pVKRazFSPyNxOywZy6uulbhja2lveMu0dd+7hT+aXMFZTIetHtgLDe57V5GsTiRWYitdFNHW1hIB7xE3R2pL5ItSlG5VK3Z72Lr7UiGHGUQFqdWSTOCBlkXN+BoH1KdVwR/mgbcZFL1EuvTBfcUbtdkpJMhBiR82DRMy8wQiLGydX+J1RPQObvQPCwsB+ngzhYexr2TaeYm2YqU7dWJLDF6X+WBONfdMMvXGSqtACOXN3SFW/dkc7Hn+rL/H6q0hJFWJBV7sWH+cIKEwieQdhrOTFhPR/E0idGPu+3RMUSw66WluGytS8uP17aNH+VwwhIC9v/FZPmav97je1no5VPcMDDDH/MLg1BnSoKz4jXw4guozVwH6siS4yj1NTfofQPCUBqryMgmIBb6UfTFu+rPT0mr02biHHLtZ+wXC8Ar0VpIEnkd1c5YH3OmdqRZ6TpNA05LucIAsPu6ldh7/0p5Cx2JXz8G9UPsvaOX+MLCNf5zyeQJHElGrdSIbqu9999aBshR6XBL9491Qndf9vA1W3RndyYMA7f0ta0MD3BY6h39I1M4SMvUdfjX0m7yUOzrRqz/Z8yPUZnPb5LEkltFFaOYvthIxumo4x7PXoYwMmEut/+XazGG/0nb4EzleCUPWR9KcPUz3SusCcTTGbefyK+hSsZLFGrtU3QJ13n8YNcuhXAoJJOsRPQI/wfmxszv9c9xFMTx7p8o9LZe4aHwc/ZphR0Ww16JX9nsKMxyPqKAn3WDjW9yfgSHNtUVe8tFwA4jZeKw0hHbSZ0oTFxe1LcO8QIENPChhoXA3lKV7QUgSnkW/lmHJxScirNK9rR725Bp/r/Tkk2CLUk/Fi/+d1x91ngC9lUaQGZy2vaQSBLpL8s9udIZDvdQc1tT6eZhH6qrC1EfYp1KMWJ20KgXRZrahFTDxfChLGUvPIAClSvCsoe0lWuaLh9xV2VO3GwJerxo0DygG3W+K9RHn+6+Mqf2aSrZAZu1bNCr5BYDwmxLF7KA8TDu6IrK6Ljd/BeIAiR5iIcpx1EYwOuG7b9l63d/SXjDhG0KpuTVZ4ugXY47/l0SRzQxI3EifoXuesicEiXyghQwVDUhSnmsoj1bRBhB8vkzL72b88UhGaMaOz7puvwQGVG/NlfBF6RNlv+WdfoNoYnHQ+BQlvcWkjLBoLu7DFpIwOOgVhHxvFOTvb0MxUkWwpyNDjwbN2TUg2Jf1wU8400OStwb4KvMpoDtcEK17fWLf+zeYC2cGAEmMkM5vwPI1Zby5lrSvCRJhY6RKRSt7c9AOC6cA2kiaZ2tqVrniWJbNE959n285LwDZtRSZGp4BzyGPAtOMMaENcNIOo/8PYKGBFMeTBsZtF+VICLHDhA008M4pLDmUW4m4lGc4bOwP29EExX4Jzu9fh1UiHlvoOrS7epZRGDDT9C6KTmtDKWGz9ovmu/iJjWaeSiRE7dLsIWrj0jf9FZnP92HmCCuW+LsoWAnmjcABOSXZBAwlIiFlRKCj3Qxc3Zr1iDF8533MCjDKq41c0lDFJU7yqFCapSlcZEFUgSlWyUtvCAbze7GAVWmB8yeu3qWtYQdC/0D84ChEvtijdxbkFW1vzO1YbYxlAFYCEuxlMUIjf8EmT9C2H8Vk5pg1m7CGmlC73amskYrYVlw28wpbKYHYWqJhwLPiDS+2Qaz2SvDkc7SDMsugXZACmDIAdGvCeSeL+gqoud+iSKSg+ggNefYWcdMTAkvXECxkYg31mOvGhF/zOZDWPVE6kGHW5osTI6OaMStPoPjC0axUOhndCidn909LP4BwbwYGkyFeVnDs1CctxOTTBCZLgyhL6GQh9bVbJffzx0FL3n5J73N75Bi3U662zmpZJbwHNMhCABFzRQYTzUHMeAqR2pgSMCNwZgplTbvYOlk0WvgtG+9dC8czWFRi4QtcxCpdroTMBooMPFHUmQaJUG2CtfcLw31Kz4rkW1egatzAGs51nLKHRVQpO490cPum2jReq6/TAs9Fisb3CZFJDpzSs4WaUNJkze3qP9NCkomRFLiI0F8drUMucgX2q+fpBvsZ3set82oViFISSmWbLHyiScONXCILTerIHH96tP+Dbh5+NbxvCe76pooqASJefyQJvO+fEAUr9FRnxTuO/J8yQqiOQ0OQQAh37A3yYgMVf8u4nrNoaTsO1OA/R5qTwvmJCs7RFMIFR5gwNYBp/pzKtSWdOWyzVwerDQpmvva0yiMB2+Hhpnm4G31fSrCCQJFj4CYjOVmpjYGVye8C4IQInQtYAk2arZ6+e+yOfliISvR6WaJJz85O6KwxXX18/ZLf5eMA9om/oo/2KYF8fygmYWew9re5v/m0ZG4wBV36cOyIcfYFTkiJBMtURGafIM74WP5CyORqJf17koesUSOOm61eH+XXJAbgYV5eNJwDdcie697f5gqDDC2/N5Ts9+2J9gAAAHlMEtB2ooQ6LSAAAAAAAAAAAAAA=" alt="MAPIT" style="max-width: 200px; height: auto;">
      </div>
      <div class="content">
        <div class="body-text">${content.body}</div>
        ${content.ctaUrl ? `<div class="cta-container"><a href="${content.ctaUrl}" class="cta-button">${content.ctaText || 'View'}</a></div>` : ''}
        <div class="divider"></div>
        <div class="footer">
          ${content.footer || 'Thank you for using Mapit'}
          <br><br>
          <a href="https://mapit.skyveedrones.com">Visit Mapit</a> | <a href="mailto:support@skyveedrones.com">Contact Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get common email headers for enterprise compatibility
 */
function getEmailHeaders() {
  return {
    'X-Entity-Ref-ID': `mapit-${Date.now()}`,
    'X-Mailer': 'Mapit/1.0',
    'X-Priority': '3', // Normal priority
    'X-MSMail-Priority': 'Normal',
    'Importance': 'normal',
    'List-Unsubscribe': '<mailto:support@skyveedrones.com?subject=unsubscribe>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence': 'bulk',
  };
}

/**
 * Send project invitation email
 */
export async function sendProjectInvitationEmail(params: {
  to: string;
  projectName: string;
  inviterName: string;
  inviteLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, inviterName, inviteLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `${inviterName} invited you to ${projectName}`,
      title: `You're invited to ${projectName}`,
      body: `<p>Hello,</p><p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> using Mapit, a professional drone mapping and project management platform.</p><p>Click the button below to accept the invitation and start collaborating.</p>`,
      ctaText: 'Accept Invitation',
      ctaUrl: inviteLink,
      footer: 'If you did not expect this invitation, you can safely ignore this email.',
    });

    const { error } = await getResend().emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${inviterName} invited you to "${projectName}" on Mapit`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send project invitation to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Project invitation sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending project invitation:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send project welcome email (after accepting invitation)
 */
export async function sendProjectWelcomeEmail(params: {
  to: string;
  projectName: string;
  projectLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, projectLink } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `You now have access to ${projectName}`,
      title: `Welcome to ${projectName}`,
      body: `<p>Hello,</p><p>You now have access to <strong>${projectName}</strong> on Mapit. You can start viewing and collaborating on this project right away.</p><p>Use the button below to open the project and begin working with your team.</p>`,
      ctaText: 'Open Project',
      ctaUrl: projectLink,
      footer: 'Questions? Contact our support team at support@skyveedrones.com',
    });

    const { error } = await getResend().emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `Welcome to Mapit - You now have access to "${projectName}"`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send project welcome email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Project welcome email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending project welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(params: {
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to } = params;

  try {
    const html = generateEmailTemplate({
      preheader: 'Test email to verify Mapit configuration',
      title: 'Mapit Test Email',
      body: `<p>Hello,</p><p>This is a test email from Mapit to verify that your email configuration is working correctly.</p><p>If you received this email in your inbox, your email authentication (SPF, DKIM, DMARC) is properly configured and emails are being delivered successfully.</p>`,
      footer: 'This is an automated test email. No action is required.',
    });

    const { error } = await getResend().emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: 'Mapit Test Email - Configuration Verified',
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send test email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Test email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending test email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send report via email
 */
export async function sendReportEmail(params: {
  to: string;
  projectName: string;
  reportUrl: string;
  senderName: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, reportUrl, senderName } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `${senderName} shared a report for ${projectName}`,
      title: `Project Report: ${projectName}`,
      body: `<p>Hello,</p><p>${senderName} has shared a project report for <strong>${projectName}</strong> with you.</p><p>Click the button below to view the report.</p>`,
      ctaText: 'View Report',
      ctaUrl: reportUrl,
      footer: 'Questions about this report? Contact the sender or our support team at support@skyveedrones.com',
    });

    const { error } = await getResend().emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${senderName} shared a report for "${projectName}"`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send report email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Report email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending report email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send client welcome email
 */
export async function sendClientWelcomeEmail(params: {
  to: string;
  clientName: string;
  projectName: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, clientName, projectName, loginUrl } = params;

  try {
    const html = generateEmailTemplate({
      preheader: `Welcome to Mapit - Your project ${projectName} is ready`,
      title: `Welcome to Mapit, ${clientName}`,
      body: `<p>Hello ${clientName},</p><p>Welcome to Mapit! Your project <strong>${projectName}</strong> has been set up and is ready for collaboration.</p><p>Use the button below to log in and start viewing your project details, media files, and reports.</p>`,
      ctaText: 'Log In to Mapit',
      ctaUrl: loginUrl,
      footer: 'If you have any questions, our support team is here to help at support@skyveedrones.com',
    });

    const { error } = await getResend().emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `Welcome to Mapit - Your project ${projectName} is ready`,
      html,
      headers: getEmailHeaders(),
    });

    if (error) {
      console.error('[Email] Failed to send client welcome email to', to, ':', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Client welcome email sent to', to);
    return { success: true };
  } catch (err) {
    console.error('[Email] Exception sending client welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
