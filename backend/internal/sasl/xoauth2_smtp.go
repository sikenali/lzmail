package sasl

import (
	"errors"
	"net"
	"net/smtp"
)

// XOAUTH2Auth 实现 smtp.Auth 接口，用于 SMTP 的 XOAUTH2 认证。
type XOAUTH2Auth struct {
	username    string
	accessToken string
}

func NewXOAUTH2Auth(username, accessToken string) smtp.Auth {
	return &XOAUTH2Auth{username: username, accessToken: accessToken}
}

func (a *XOAUTH2Auth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	if !server.TLS && !isLocalhost(server.Name) {
		return "", nil, errors.New("unencrypted connection")
	}
	mech := "XOAUTH2"
	ir := "user=" + a.username + "\x01auth=Bearer " + a.accessToken + "\x01\x01"
	return mech, []byte(ir), nil
}

func (a *XOAUTH2Auth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		return nil, errors.New("unexpected server challenge")
	}
	return nil, nil
}

func isLocalhost(host string) bool {
	h, _, err := net.SplitHostPort(host)
	if err != nil {
		h = host
	}
	return h == "localhost" || h == "127.0.0.1" || h == "::1"
}
