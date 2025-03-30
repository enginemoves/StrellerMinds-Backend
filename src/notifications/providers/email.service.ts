import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as nodemailer from "nodemailer"

export interface EmailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
  metadata?: Record<string, any>
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter

  constructor(private configService: ConfigService) {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const host = this.configService.get<string>("EMAIL_HOST")
    const port = this.configService.get<number>("EMAIL_PORT")
    const user = this.configService.get<string>("EMAIL_USER")
    const pass = this.configService.get<string>("EMAIL_PASSWORD")
    const from = this.configService.get<string>("EMAIL_FROM")

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    // Verify connection
    this.transporter
      .verify()
      .then(() => this.logger.log("Email service ready"))
      .catch((err) => this.logger.error(`Email service error: ${err.message}`))
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const { to, subject, text, html, metadata } = options

      await this.transporter.sendMail({
        from: this.configService.get<string>("EMAIL_FROM"),
        to,
        subject,
        text,
        html: html || text,
        ...metadata,
      })

      this.logger.log(`Email sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`)
      throw error
    }
  }
}

