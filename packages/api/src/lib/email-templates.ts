export const getRegistrationEmailHtml = (data: { name: string; programName: string; batchName: string }) => {
  const companyName = "Captive";
  const supportEmail = "support@captiveau.fun";
  const actionUrl = "https://captiveau.fun/dashboard"; // Adjust if needed
  const logoUrl = "https://pub-02758253106d4826b006a6b8c4c7959c.r2.dev/captive-logo.png"; // Placeholder or real logo

  // Hardcoded HTML from packages/docs/mail/template/mentoring-applicant.html
  // Modified to use context variables
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pendaftaran Mentoring Berhasil</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .column { display: inline-block; vertical-align: top; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .container { width: 100% !important; padding: 20px !important; }
      .column { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 20px !important; }
      .mobile-hide { display: none !important; }
      .mobile-full-width { width: 100% !important; }
      h1 { font-size: 24px !important; line-height: 1.3 !important; }
      h2 { font-size: 20px !important; line-height: 1.3 !important; }
      .hero-image { width: 100% !important; height: auto !important; }
      .button { width: 100% !important; }
      .button a { display: block !important; width: 100% !important; }
      .button a { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; -webkit-font-smoothing: antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 24px 40px;">
              <img src="${logoUrl}" alt="${companyName}" width="120" height="40" style="display: block;" />
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 0 40px 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #ecfdf5; border-radius: 50%; padding: 20px;">
                    <span style="display: block; width: 48px; height: 48px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Heading -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Pendaftaran Berhasil!
              </h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Halo ${data.name},
              </p>
            </td>
          </tr>
          
          <!-- Main Message -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">
                Terima kasih telah mendaftar program <strong>${data.programName} (${data.batchName})</strong>. Pendaftaran kamu telah kami terima dan sedang dalam proses seleksi.
              </p>
            </td>
          </tr>
          
          <!-- Info Card -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <!-- Clock Icon with Title -->
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align: middle; padding-right: 12px;">
                                <span style="display: block; width: 24px; height: 24px;">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                </span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                                  Langkah Selanjutnya
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Steps -->
                      <tr>
                        <td>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="vertical-align: top; padding-right: 12px;">
                                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #22c55e; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #ffffff;">1</span>
                                    </td>
                                    <td style="vertical-align: middle;">
                                      <p style="margin: 0; font-size: 14px; color: #333333;">
                                        Pendaftaran diterima
                                      </p>
                                    </td>
                                    <td style="vertical-align: middle; text-align: right;">
                                      <span style="display: inline-block; width: 16px; height: 16px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="vertical-align: top; padding-right: 12px;">
                                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #ffffff;">2</span>
                                    </td>
                                    <td style="vertical-align: middle;">
                                      <p style="margin: 0; font-size: 14px; color: #333333;">
                                        Proses seleksi (sedang berlangsung)
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="vertical-align: top; padding-right: 12px;">
                                      <span style="display: inline-block; width: 24px; height: 24px; background-color: #e2e8f0; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #64748b;">3</span>
                                    </td>
                                    <td style="vertical-align: middle;">
                                      <p style="margin: 0; font-size: 14px; color: #666666;">
                                        Pengumuman hasil seleksi
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Notice Box -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="display: block; width: 20px; height: 20px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                            </svg>
                          </span>
                        </td>
                        <td>
                          <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                            <strong>Penting:</strong> Pantau terus email kamu untuk pengumuman hasil seleksi. Pastikan email dari ${companyName} tidak masuk ke folder spam.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" class="button mobile-full-width">
                <tr>
                  <td style="border-radius: 8px; background-color: #1a1a1a;">
                    <a href="${actionUrl}" style="display: inline-block; padding: 16px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; text-align: center;">
                      Lihat Status Pendaftaran
                      <span style="display: inline-block; width: 16px; height: 16px; vertical-align: middle; margin-left: 6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Closing Message -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                Jika kamu memiliki pertanyaan, silakan hubungi kami di<br />
                <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none;">${supportEmail}</a>
              </p>
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                Semoga sukses!<br />
                <strong style="color: #333333;">Tim ${companyName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height: 12px; background-color: #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>
          
        </td>
        </tr>
        </table>
  </body>
  </html>`;
};

export const getApplicationAcceptedEmailHtml = (data: {
  firstName: string;
  programName: string;
  startDate: string;
}) => {
  const companyName = "Captive";
  const supportEmail = "support@captiveau.fun";
  const actionUrl = "https://captiveau.fun/dashboard";
  const logoUrl = "https://pub-02758253106d4826b006a6b8c4c7959c.r2.dev/captive-logo.png";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pendaftaran Mentoring Diterima</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .column { display: inline-block; vertical-align: top; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .container { width: 100% !important; padding: 20px !important; }
      .column { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 20px !important; }
      .mobile-hide { display: none !important; }
      .mobile-full-width { width: 100% !important; }
      .button-td { display: block !important; width: 100% !important; }
      .button-a { display: block !important; width: 100% !important; text-align: center !important; }
      h1 { font-size: 24px !important; line-height: 1.3 !important; }
      h2 { font-size: 20px !important; line-height: 1.3 !important; }
      .hero-image { width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; -webkit-font-smoothing: antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper" style="background-color: #f0fdf4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${logoUrl}" alt="${companyName}" width="140" height="40" style="display: block;" />
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #dcfce7; border-radius: 50%; padding: 20px;">
                    <span style="display: block; width: 48px; height: 48px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Heading -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #166534; line-height: 1.3;">
                Selamat, ${data.firstName}!
              </h1>
            </td>
          </tr>
          
          <!-- Subheading -->
          <tr>
            <td align="center" style="padding: 16px 40px 0 40px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a; line-height: 1.5;">
                Pendaftaran Mentoring Anda Telah Diterima
              </p>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding: 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
                Kami dengan senang hati mengabarkan bahwa pendaftaran Anda untuk program mentoring telah berhasil disetujui. Anda kini resmi menjadi bagian dari komunitas mentoring kami.
              </p>
            </td>
          </tr>
          
          <!-- Info Card -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <!-- Info Row 1 -->
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="display: inline-block; width: 20px; height: 20px;">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="8" r="5"></circle>
                                    <path d="M20 21a8 8 0 1 0-16 0"></path>
                                  </svg>
                                </span>
                              </td>
                              <td>
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">Status Pendaftaran</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #16a34a;">Diterima</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Info Row 2 -->
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="display: inline-block; width: 20px; height: 20px;">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                </span>
                              </td>
                              <td>
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">Tanggal Mulai</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${data.startDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Info Row 3 -->
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align: top; padding-right: 12px;">
                                <span style="display: inline-block; width: 20px; height: 20px;">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                  </svg>
                                </span>
                              </td>
                              <td>
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">Program</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${data.programName}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                Langkah Selanjutnya:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #dcfce7; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #16a34a;">1</span>
                        </td>
                        <td style="font-size: 15px; color: #4b5563; line-height: 1.5;">
                          Lengkapi profil Anda di dashboard mentoring
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #dcfce7; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #16a34a;">2</span>
                        </td>
                        <td style="font-size: 15px; color: #4b5563; line-height: 1.5;">
                          Kenali mentor yang akan membimbing Anda
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #dcfce7; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #16a34a;">3</span>
                        </td>
                        <td style="font-size: 15px; color: #4b5563; line-height: 1.5;">
                          Jadwalkan sesi mentoring pertama Anda
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 8px 40px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width">
                <tr>
                  <td style="border-radius: 8px; background-color: #16a34a;">
                    <a href="${actionUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Akses Dashboard Mentoring
                      <span style="display: inline-block; width: 16px; height: 16px; vertical-align: middle; margin-left: 6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height: 12px; background-color: #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                Jika Anda memiliki pertanyaan, silakan hubungi kami di <a href="mailto:${supportEmail}" style="color: #16a34a; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const getApplicationRejectedEmailHtml = (data: {
  firstName: string;
  programName: string;
  registrationId: string;
  rejectionReason: string;
}) => {
  const companyName = "Captive";
  const supportEmail = "support@captiveau.fun";
  const actionUrl = "https://captiveau.fun/dashboard";
  const logoUrl = "https://pub-02758253106d4826b006a6b8c4c7959c.r2.dev/captive-logo.png";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pendaftaran Mentoring Ditolak</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .column { display: inline-block; vertical-align: top; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .container { width: 100% !important; padding: 16px !important; }
      .column { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
      .mobile-hide { display: none !important; }
      .mobile-full-width { width: 100% !important; }
      .button-td { display: block !important; width: 100% !important; }
      .button-a { display: block !important; width: 100% !important; text-align: center !important; }
      h1 { font-size: 24px !important; line-height: 1.3 !important; }
      h2 { font-size: 20px !important; line-height: 1.3 !important; }
      .hero-image { width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 24px 40px;">
              <img src="${logoUrl}" alt="${companyName}" width="140" height="40" style="display: block;" />
            </td>
          </tr>

          <!-- Status Icon -->
          <tr>
            <td align="center" style="padding: 0 40px 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #fef2f2; border-radius: 50%; width: 80px; height: 80px; text-align: center; vertical-align: middle;">
                    <span style="display: inline-block; width: 40px; height: 40px; line-height: 80px;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Heading -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Pendaftaran Ditolak
              </h1>
            </td>
          </tr>

          <!-- Greeting and Message -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #333333; line-height: 1.6; text-align: center;">
                Halo ${data.firstName},
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #666666; line-height: 1.6; text-align: center;">
                Terima kasih atas minat Anda untuk bergabung dalam program mentoring kami. Setelah melalui proses seleksi yang cermat, dengan berat hati kami sampaikan bahwa pendaftaran Anda <strong style="color: #ef4444;">tidak dapat kami terima</strong> untuk periode ini.
              </p>
            </td>
          </tr>

          <!-- Info Box -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #ef4444;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detail Pendaftaran
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b;">Program</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.programName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b;">Nomor Pendaftaran</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.registrationId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b;">Status</span>
                        </td>
                        <td align="right" style="padding: 8px 0;">
                          <span style="display: inline-block; padding: 4px 12px; background-color: #fef2f2; color: #dc2626; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; font-weight: 600; border-radius: 20px;">Ditolak</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reason Section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                Alasan Penolakan:
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #666666; line-height: 1.6; padding: 16px; background-color: #fafafa; border-radius: 6px; border: 1px solid #e5e5e5;">
                ${data.rejectionReason}
              </p>
            </td>
          </tr>

          <!-- Encouragement Message -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <span style="display: inline-block; width: 24px; height: 24px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                          </span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #0369a1;">
                            Jangan menyerah!
                          </p>
                          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #0369a1; line-height: 1.6;">
                            Kami mendorong Anda untuk mendaftar kembali pada periode berikutnya. Tingkatkan keterampilan dan pengalaman Anda, dan kami berharap dapat melihat aplikasi Anda lagi di masa depan.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width">
                      <tr>
                        <td style="border-radius: 8px; background-color: #1a1a1a;">
                          <a href="${actionUrl}" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                            Lihat Program Lainnya
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width">
                      <tr>
                        <td style="border-radius: 8px; border: 2px solid #e5e5e5;">
                          <a href="mailto:${supportEmail}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #666666; text-decoration: none; border-radius: 6px;">
                            Hubungi Kami
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height: 1px; background-color: #e5e5e5;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #999999;">
                    &copy; ${year} ${companyName}. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
};
