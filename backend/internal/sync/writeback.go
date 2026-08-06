package sync

import (
	"fmt"

	"github.com/emersion/go-imap"
)

// ApplyFlag 将本地已读/星标操作写回 IMAP 服务器（\Seen / \Flagged）。
func (s *Syncer) ApplyFlag(folder string, uid uint32, flag string, set bool) error {
	c, err := s.connect()
	if err != nil {
		return err
	}
	defer c.Logout()

	if _, err := c.Select(folder, false); err != nil {
		return fmt.Errorf("select %s: %w", folder, err)
	}
	set2 := new(imap.SeqSet)
	set2.AddNum(uid)

	var op imap.FlagsOp
	var flags []interface{}
	if set {
		op = imap.AddFlags
		flags = []interface{}{flag}
	} else {
		op = imap.RemoveFlags
		flags = []interface{}{flag}
	}
	item := imap.FormatFlagsOp(op, false)
	if err := c.UidStore(set2, item, flags, nil); err != nil {
		return err
	}
	return nil
}

// MoveMessage 将邮件从 srcFolder 移动到 destFolder。
func (s *Syncer) MoveMessage(srcFolder string, uid uint32, destFolder string) error {
	c, err := s.connect()
	if err != nil {
		return err
	}
	defer c.Logout()

	if _, err := c.Select(srcFolder, false); err != nil {
		return fmt.Errorf("select %s: %w", srcFolder, err)
	}
	set := new(imap.SeqSet)
	set.AddNum(uid)
	if err := c.UidMove(set, destFolder); err != nil {
		return err
	}
	return nil
}

// DeleteMessage 标记 \Deleted 并 expunge，从 IMAP 服务器删除。
func (s *Syncer) DeleteMessage(folder string, uid uint32) error {
	c, err := s.connect()
	if err != nil {
		return err
	}
	defer c.Logout()

	if _, err := c.Select(folder, false); err != nil {
		return fmt.Errorf("select %s: %w", folder, err)
	}
	set := new(imap.SeqSet)
	set.AddNum(uid)
	item := imap.FormatFlagsOp(imap.AddFlags, false)
	if err := c.UidStore(set, item, []interface{}{imap.DeletedFlag}, nil); err != nil {
		return err
	}
	if err := c.Expunge(nil); err != nil {
		return err
	}
	return nil
}
