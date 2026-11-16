// Package sasl 提供自定义 SASL 认证机制（XOAUTH2）
package sasl

import "errors"

// XOAUTH2 实现 go-sasl Client 接口，用于 IMAP 的 XOAUTH2 认证。
// 参考 RFC 7628 / GMail XOAUTH2。
type XOAUTH2 struct {
	username    string
	accessToken string
}

func NewXOAUTH2(username, accessToken string) *XOAUTH2 {
	return &XOAUTH2{username: username, accessToken: accessToken}
}

func (a *XOAUTH2) Start() (string, []byte, error) {
	return "XOAUTH2", []byte(a.response()), nil
}

func (a *XOAUTH2) Next(challenge []byte) ([]byte, error) {
	return nil, errors.New("unexpected server challenge")
}

func (a *XOAUTH2) response() string {
	return "user=" + a.username + "\x01auth=Bearer " + a.accessToken + "\x01\x01"
}
